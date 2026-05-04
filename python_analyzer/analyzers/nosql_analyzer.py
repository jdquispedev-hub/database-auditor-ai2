"""
Analizador NoSQL/JSON/YAML/Excel con librerías especializadas
Procesa documentos NoSQL, JSON, YAML y archivos Excel
"""

import json
import yaml
import pandas as pd
from jsonschema import validate, ValidationError
from typing import Dict, List, Any

class NoSQLAnalyzer:
    def __init__(self):
        self.supported_formats = ['.json', '.yaml', '.yml', '.xlsx', '.xls']
    
    def parse_json(self, content: str) -> Dict[str, Any]:
        """Parsea contenido JSON y extrae esquema"""
        try:
            data = json.loads(content)
            return self._extract_schema_from_data(data, 'json')
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON inválido: {str(e)}")
    
    def parse_yaml(self, content: str) -> Dict[str, Any]:
        """Parsea contenido YAML y extrae esquema"""
        try:
            data = yaml.safe_load(content)
            return self._extract_schema_from_data(data, 'yaml')
        except yaml.YAMLError as e:
            raise ValueError(f"YAML inválido: {str(e)}")
    
    def parse_excel(self, file_path) -> Dict[str, Any]:
        """Parsea archivo Excel y extrae esquema"""
        try:
            # Leer todas las hojas
            excel_file = pd.ExcelFile(file_path)
            tables = []
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                # Extraer información de columnas
                columns = []
                for col in df.columns:
                    # Inferir tipo de dato
                    dtype = str(df[col].dtype)
                    python_type = self._pandas_type_to_sql_type(dtype)
                    
                    columns.append({
                        'name': str(col),
                        'type': python_type,
                        'nullable': df[col].isnull().any(),
                        'primaryKey': False,
                        'autoIncrement': False
                    })
                
                tables.append({
                    'name': sheet_name,
                    'columns': columns,
                    'primaryKeys': [],
                    'foreignKeys': []
                })
            
            return {
                'tables': tables,
                'relations': [],
                'format': 'excel',
                'totalTables': len(tables),
                'totalRelations': 0
            }
            
        except Exception as e:
            raise ValueError(f"Error al leer Excel: {str(e)}")
    
    def _extract_schema_from_data(self, data: Any, format_type: str) -> Dict[str, Any]:
        """Extrae esquema desde datos JSON/YAML"""
        tables = []
        relations = []
        
        if isinstance(data, dict):
            # Caso 1: Objeto con tablas/collections
            if 'tables' in data or 'collections' in data:
                items = data.get('tables', data.get('collections', {}))
                
                if isinstance(items, list):
                    # Lista de tablas
                    for item in items:
                        table = self._extract_table_from_object(item)
                        if table:
                            tables.append(table)
                elif isinstance(items, dict):
                    # Diccionario de tablas
                    for name, item in items.items():
                        table = self._extract_table_from_object(item, name)
                        if table:
                            tables.append(table)
            
            # Caso 2: Objeto simple - tratar como una tabla
            else:
                table = self._extract_table_from_object(data, 'main')
                if table:
                    tables.append(table)
        
        elif isinstance(data, list):
            # Caso 3: Array de documentos - tratar como una tabla
            if data:
                table = self._extract_table_from_array(data, 'documents')
                if table:
                    tables.append(table)
        
        # Extraer relaciones si existen
        if isinstance(data, dict) and 'relations' in data:
            relations = data['relations']
        
        return {
            'tables': tables,
            'relations': relations,
            'format': format_type,
            'totalTables': len(tables),
            'totalRelations': len(relations)
        }
    
    def _extract_table_from_object(self, obj: Any, table_name: str = None) -> Dict[str, Any]:
        """Extrae tabla desde objeto"""
        if not isinstance(obj, dict):
            return None
        
        # Si el objeto tiene 'name' y 'columns', es una definición de tabla
        if 'columns' in obj or 'fields' in obj:
            name = table_name or obj.get('name', 'unknown')
            columns = obj.get('columns', obj.get('fields', []))
            
            return {
                'name': name,
                'columns': self._normalize_columns(columns),
                'primaryKeys': obj.get('primaryKeys', []),
                'foreignKeys': obj.get('foreignKeys', [])
            }
        
        # Si no, inferir estructura desde las propiedades del objeto
        else:
            name = table_name or 'inferred_table'
            columns = []
            
            for key, value in obj.items():
                col_type = self._infer_type_from_value(value)
                columns.append({
                    'name': key,
                    'type': col_type,
                    'nullable': True,  # Asumir nullable en NoSQL
                    'primaryKey': key.lower() == 'id',
                    'autoIncrement': False
                })
            
            return {
                'name': name,
                'columns': columns,
                'primaryKeys': ['id'] if any(col['name'] == 'id' for col in columns) else [],
                'foreignKeys': []
            }
    
    def _extract_table_from_array(self, arr: List[Any], table_name: str) -> Dict[str, Any]:
        """Extrae tabla desde array de documentos"""
        if not arr:
            return None
        
        # Recolectar todas las claves posibles
        all_keys = set()
        for item in arr:
            if isinstance(item, dict):
                all_keys.update(item.keys())
        
        # Crear columnas basadas en tipos detectados
        columns = []
        for key in all_keys:
            # Encontrar el primer valor no nulo para inferir tipo
            inferred_type = 'STRING'
            for item in arr:
                if isinstance(item, dict) and key in item and item[key] is not None:
                    inferred_type = self._infer_type_from_value(item[key])
                    break
            
            columns.append({
                'name': key,
                'type': inferred_type,
                'nullable': True,  # En NoSQL usualmente nullable
                'primaryKey': key.lower() == 'id',
                'autoIncrement': False
            })
        
        return {
            'name': table_name,
            'columns': columns,
            'primaryKeys': ['id'] if any(col['name'] == 'id' for col in columns) else [],
            'foreignKeys': []
        }
    
    def _normalize_columns(self, columns: Any) -> List[Dict[str, Any]]:
        """Normaliza diferentes formatos de columnas"""
        if isinstance(columns, list):
            return columns
        elif isinstance(columns, dict):
            # Convertir diccionario a lista de columnas
            result = []
            for name, col_info in columns.items():
                if isinstance(col_info, dict):
                    col_info['name'] = name
                    result.append(col_info)
                else:
                    # Simple type string
                    result.append({
                        'name': name,
                        'type': str(col_info),
                        'nullable': True,
                        'primaryKey': False,
                        'autoIncrement': False
                    })
            return result
        else:
            return []
    
    def _infer_type_from_value(self, value: Any) -> str:
        """Infiere tipo SQL desde valor Python"""
        if value is None:
            return 'NULL'
        elif isinstance(value, bool):
            return 'BOOLEAN'
        elif isinstance(value, int):
            return 'INTEGER'
        elif isinstance(value, float):
            return 'FLOAT'
        elif isinstance(value, str):
            # Intentar detectar patrones especiales
            if value.lower() in ('true', 'false'):
                return 'BOOLEAN'
            elif value.isdigit():
                return 'INTEGER'
            elif self._is_float(value):
                return 'FLOAT'
            elif len(value) > 255:
                return 'TEXT'
            else:
                return 'VARCHAR(255)'
        elif isinstance(value, list):
            return 'ARRAY'
        elif isinstance(value, dict):
            return 'JSON'
        else:
            return 'VARCHAR(255)'
    
    def _is_float(self, value: str) -> bool:
        """Verifica si string representa un float"""
        try:
            float(value)
            return '.' in value
        except ValueError:
            return False
    
    def _pandas_type_to_sql_type(self, dtype: str) -> str:
        """Convierte tipo pandas a tipo SQL"""
        dtype = dtype.lower()
        
        if 'int' in dtype:
            return 'INTEGER'
        elif 'float' in dtype:
            return 'FLOAT'
        elif 'bool' in dtype:
            return 'BOOLEAN'
        elif 'datetime' in dtype:
            return 'DATETIME'
        elif 'object' in dtype:
            return 'VARCHAR(255)'
        else:
            return 'VARCHAR(255)'
    
    def validate_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Valida esquema NoSQL"""
        validation = {
            'isValid': True,
            'errors': [],
            'warnings': [],
            'suggestions': []
        }
        
        tables = schema.get('tables', [])
        
        if not tables:
            validation['errors'].append("No se encontraron tablas en el documento")
            validation['isValid'] = False
            return validation
        
        for table in tables:
            # Validar nombre de tabla
            if not table.get('name'):
                validation['errors'].append("Tabla sin nombre encontrada")
                validation['isValid'] = False
                continue
            
            # Validar columnas
            columns = table.get('columns', [])
            if not columns:
                validation['warnings'].append(f"Tabla {table['name']} no tiene columnas definidas")
                continue
            
            # Validar cada columna
            for col in columns:
                if not col.get('name'):
                    validation['errors'].append(f"Columna sin nombre en tabla {table['name']}")
                    validation['isValid'] = False
                
                # Detectar tipos genéricos
                if col.get('type') in ['STRING', 'OBJECT']:
                    validation['suggestions'].append(
                        f"Considerar especificar tipo más preciso para columna {col['name']} en tabla {table['name']}"
                    )
        
        return validation
    
    def calculate_metrics(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Calcula métricas del esquema NoSQL"""
        tables = schema.get('tables', [])
        
        total_columns = sum(len(table.get('columns', [])) for table in tables)
        total_primary_keys = sum(len(table.get('primaryKeys', [])) for table in tables)
        
        # Calcular tipos de datos
        type_distribution = {}
        for table in tables:
            for col in table.get('columns', []):
                col_type = col.get('type', 'UNKNOWN')
                type_distribution[col_type] = type_distribution.get(col_type, 0) + 1
        
        # Calcular score de estructura
        structure_score = self._calculate_structure_score(tables)
        
        return {
            'totalTables': len(tables),
            'totalColumns': total_columns,
            'totalPrimaryKeys': total_primary_keys,
            'avgColumnsPerTable': total_columns / len(tables) if tables else 0,
            'typeDistribution': type_distribution,
            'structureScore': structure_score,
            'format': schema.get('format', 'unknown')
        }
    
    def _calculate_structure_score(self, tables: List[Dict[str, Any]]) -> float:
        """Calcula puntaje de estructura NoSQL"""
        if not tables:
            return 0.0
        
        score = 50.0  # Base
        
        for table in tables:
            columns = table.get('columns', [])
            
            # Tiene columnas bien definidas
            if columns:
                score += 10
            
            # Tiene primary key
            if table.get('primaryKeys'):
                score += 15
            
            # Nombres descriptivos
            good_names = sum(1 for col in columns if len(col.get('name', '')) > 2)
            if columns:
                score += (good_names / len(columns)) * 10
            
            # Tipos específicos
            specific_types = sum(1 for col in columns if col.get('type') not in ['STRING', 'OBJECT'])
            if columns:
                score += (specific_types / len(columns)) * 15
        
        return min(100.0, score)
    
    def detect_anomalies(self, schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detecta anomalías en esquema NoSQL"""
        anomalies = []
        
        for table in schema.get('tables', []):
            # Detectar tablas sin ID
            if not table.get('primaryKeys'):
                anomalies.append({
                    'type': 'missing_identifier',
                    'severity': 'medium',
                    'table': table['name'],
                    'description': f"Tabla {table['name']} no tiene identificador único",
                    'recommendation': 'Agregar campo _id o id como identificador único'
                })
            
            # Detectar columnas con tipos genéricos
            for col in table.get('columns', []):
                col_type = col.get('type', '').upper()
                if col_type in ['STRING', 'OBJECT']:
                    anomalies.append({
                        'type': 'generic_type',
                        'severity': 'low',
                        'table': table['name'],
                        'column': col['name'],
                        'description': f"Columna {col['name']} tiene tipo genérico {col_type}",
                        'recommendation': 'Especificar tipo más preciso (VARCHAR, INTEGER, etc.)'
                    })
                
                # Detectar nombres muy cortos
                if len(col.get('name', '')) < 2:
                    anomalies.append({
                        'type': 'short_column_name',
                        'severity': 'low',
                        'table': table['name'],
                        'column': col['name'],
                        'description': f"Columna {col['name']} tiene nombre muy corto",
                        'recommendation': 'Usar nombres más descriptivos'
                    })
        
        return anomalies
