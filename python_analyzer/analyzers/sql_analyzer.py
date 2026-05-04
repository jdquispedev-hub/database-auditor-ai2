"""
Analizador SQL con SQLGlot y sql-metadata
Reemplaza análisis de OpenAI para SQL con librerías especializadas
"""

import re
import sqlglot
from sql_metadata import Parser
from typing import Dict, List, Any

class SQLAnalyzer:
    def __init__(self):
        self.supported_dialects = [
            'mysql', 'postgres', 'sqlite', 'sqlserver', 'oracle', 
            'bigquery', 'snowflake', 'redshift', 'clickhouse'
        ]
    
    def parse_sql(self, content: str) -> Dict[str, Any]:
        """Parsea contenido SQL y extrae esquema completo"""
        try:
            # Detectar dialecto automáticamente
            dialect = self._detect_dialect(content)
            
            # Parsear con SQLGlot
            parsed = sqlglot.parse(content, dialect=dialect)
            
            # Extraer tablas y relaciones
            tables = []
            relations = []
            
            for stmt in parsed:
                if stmt.key == 'create':
                    table_info = self._extract_table_info(stmt)
                    if table_info:
                        tables.append(table_info)
                
                # Extraer relaciones FOREIGN KEY
                if stmt.key == 'alter':
                    relation = self._extract_relation(stmt)
                    if relation:
                        relations.append(relation)
            
            return {
                'tables': tables,
                'relations': relations,
                'dialect': dialect,
                'totalTables': len(tables),
                'totalRelations': len(relations)
            }
            
        except Exception as e:
            # Fallback a parsing básico con regex
            return self._fallback_parse(content)
    
    def _detect_dialect(self, content: str) -> str:
        """Detecta el dialecto SQL basado en patrones"""
        content_lower = content.lower()
        
        if 'bigint' in content_lower or 'serial' in content_lower:
            return 'postgres'
        elif 'auto_increment' in content_lower:
            return 'mysql'
        elif 'identity' in content_lower:
            return 'sqlserver'
        elif any(keyword in content_lower for keyword in ['bigquery', 'array', 'struct']):
            return 'bigquery'
        else:
            return 'mysql'  # Default
    
    def _extract_table_info(self, stmt) -> Dict[str, Any]:
        """Extrae información completa de una tabla"""
        table_name = stmt.args.get('this', {}).get('this', 'unknown')
        
        columns = []
        primary_keys = []
        foreign_keys = []
        
        # Extraer columnas
        for column_def in stmt.args.get('columns', []):
            if column_def.key == 'column_def':
                col_name = column_def.args.get('this', {}).get('this', 'unknown')
                col_type = self._get_column_type(column_def)
                
                # Detectar constraints
                nullable = True
                auto_increment = False
                primary_key = False
                
                for constraint in column_def.args.get('constraints', []):
                    if constraint.key == 'not':
                        nullable = False
                    elif constraint.key == 'primary_key':
                        primary_key = True
                        primary_keys.append(col_name)
                    elif constraint.key == 'auto_increment':
                        auto_increment = True
                
                columns.append({
                    'name': col_name,
                    'type': col_type,
                    'nullable': nullable,
                    'primaryKey': primary_key,
                    'autoIncrement': auto_increment
                })

        for col in columns:
            if col.get('primaryKey') and col['name'] not in primary_keys:
                primary_keys.append(col['name'])
        
        return {
            'name': table_name,
            'columns': columns,
            'primaryKeys': primary_keys,
            'foreignKeys': foreign_keys
        }
    
    def _get_column_type(self, column_def) -> str:
        """Extrae tipo de dato de columna"""
        type_def = column_def.args.get('kind', {})
        if hasattr(type_def, 'this'):
            return str(type_def.this)
        return 'VARCHAR'
    
    def _extract_relation(self, stmt) -> Dict[str, Any]:
        """Extrae relaciones FOREIGN KEY"""
        # Implementar extracción de relaciones
        return None
    
    def _fallback_parse(self, content: str) -> Dict[str, Any]:
        """Parsing básico con regex como fallback"""
        tables = []
        relations = []
        
        # Detectar CREATE TABLE con regex
        create_table_pattern = r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)(?:\s*;|$)'
        
        for match in re.finditer(create_table_pattern, content, re.IGNORECASE):
            table_name = match.group(1)
            table_content = match.group(2)
            
            columns = self._parse_columns_basic(table_content)
            pks = [col['name'] for col in columns if col.get('primaryKey')]
            
            tables.append({
                'name': table_name,
                'columns': columns,
                'primaryKeys': pks,
                'foreignKeys': []
            })
        
        return {
            'tables': tables,
            'relations': relations,
            'dialect': 'unknown',
            'totalTables': len(tables),
            'totalRelations': len(relations)
        }
    
    def _parse_columns_basic(self, table_content: str) -> List[Dict[str, Any]]:
        """Parse básico de columnas con regex"""
        columns = []
        
        # Dividir por comas ignorando paréntesis
        lines = []
        current_line = ''
        paren_depth = 0
        
        for char in table_content:
            if char == '(':
                paren_depth += 1
            elif char == ')':
                paren_depth -= 1
            elif char == ',' and paren_depth == 0:
                if current_line.strip():
                    lines.append(current_line.strip())
                current_line = ''
                continue
            current_line += char
        
        if current_line.strip():
            lines.append(current_line.strip())
        
        # Parsear cada línea de columna
        for line in lines:
            upper_line = line.upper().strip()
            if not line or any(upper_line.startswith(keyword) for keyword in ['PRIMARY KEY', 'FOREIGN KEY', 'CONSTRAINT', 'INDEX', 'UNIQUE KEY', 'KEY']):
                continue
            
            # Extraer nombre y tipo
            parts = line.split(None, 2)
            if len(parts) >= 2:
                col_name = parts[0].strip('`"')
                col_type = parts[1].upper()
                
                # Detectar nullable
                nullable = 'NOT NULL' not in line.upper()
                
                # Detectar auto increment
                auto_increment = 'AUTO_INCREMENT' in line.upper()
                
                # Detectar primary key
                primary_key = 'PRIMARY KEY' in line.upper()
                
                columns.append({
                    'name': col_name,
                    'type': col_type,
                    'nullable': nullable,
                    'primaryKey': primary_key,
                    'autoIncrement': auto_increment
                })
        
        return columns
    
    def validate_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Valida el esquema y detecta problemas básicos"""
        validation = {
            'isValid': True,
            'errors': [],
            'warnings': [],
            'suggestions': []
        }
        
        for table in schema.get('tables', []):
            # Validar nombres de tabla
            if not table['name'] or not table['name'].replace('_', '').isalnum():
                validation['errors'].append(f"Nombre de tabla inválido: {table['name']}")
                validation['isValid'] = False
            
            # Validar columnas
            if not table.get('columns'):
                validation['errors'].append(f"Tabla {table['name']} no tiene columnas")
                validation['isValid'] = False
                continue
            
            # Detectar columnas sin tipo
            for col in table['columns']:
                if not col.get('type') or col['type'] == 'VARCHAR':
                    validation['warnings'].append(f"Columna {col['name']} en tabla {table['name']} podría necesitar tipo específico")
                
                # Detectar nombres de columna
                if not col['name'] or not col['name'].replace('_', '').isalnum():
                    validation['errors'].append(f"Nombre de columna inválido: {col['name']}")
                    validation['isValid'] = False
        
        return validation
    
    def calculate_metrics(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Calcula métricas del esquema"""
        tables = schema.get('tables', [])
        
        total_columns = sum(len(table.get('columns', [])) for table in tables)
        total_primary_keys = sum(len(table.get('primaryKeys', [])) for table in tables)
        total_foreign_keys = sum(len(table.get('foreignKeys', [])) for table in tables)
        
        # Calcular normalización básica
        normalization_score = self._calculate_normalization_score(tables)
        
        return {
            'totalTables': len(tables),
            'totalColumns': total_columns,
            'totalPrimaryKeys': total_primary_keys,
            'totalForeignKeys': total_foreign_keys,
            'avgColumnsPerTable': total_columns / len(tables) if tables else 0,
            'normalizationScore': normalization_score,
            'hasRelations': total_foreign_keys > 0
        }
    
    def _calculate_normalization_score(self, tables: List[Dict[str, Any]]) -> float:
        """Calcula puntaje de normalización básico"""
        score = 50.0  # Base
        
        # Sumar puntos por buenas prácticas
        for table in tables:
            columns = table.get('columns', [])
            
            # Tiene primary key
            if table.get('primaryKeys'):
                score += 10
            
            # Tiene foreign keys
            if table.get('foreignKeys'):
                score += 15
            
            # Columnas bien nombradas
            good_names = sum(1 for col in columns if col['name'].replace('_', '').isalnum())
            if columns:
                score += (good_names / len(columns)) * 10
            
            # Tipos de datos específicos
            specific_types = sum(1 for col in columns if col['type'] not in ['VARCHAR', 'TEXT'])
            if columns:
                score += (specific_types / len(columns)) * 5
        
        return min(100.0, score)
    
    def detect_anomalies(self, schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detecta anomalías comunes en el esquema"""
        anomalies = []
        
        for table in schema.get('tables', []):
            # Detectar tablas sin primary key
            has_pk = table.get('primaryKeys') or any(col.get('primaryKey') for col in table.get('columns', []))
            if not has_pk:
                anomalies.append({
                    'type': 'missing_primary_key',
                    'severity': 'high',
                    'table': table['name'],
                    'description': f"Tabla {table['name']} no tiene clave primaria definida",
                    'recommendation': 'Agregar una columna id AUTO_INCREMENT PRIMARY KEY'
                })
            
            # Detectar columnas con nombres genéricos
            generic_names = ['id', 'name', 'description', 'created_at', 'updated_at']
            for col in table.get('columns', []):
                if col['name'].lower() in generic_names and not col.get('primaryKey'):
                    anomalies.append({
                        'type': 'generic_column_name',
                        'severity': 'medium',
                        'table': table['name'],
                        'column': col['name'],
                        'description': f"Columna {col['name']} tiene nombre genérico",
                        'recommendation': f"Considerar renombrar a {table['name']}_{col['name']}"
                    })
                
                # Detectar tipos muy grandes
                if 'TEXT' in col['type'].upper() and not col.get('nullable'):
                    anomalies.append({
                        'type': 'large_required_field',
                        'severity': 'medium',
                        'table': table['name'],
                        'column': col['name'],
                        'description': f"Columna {col['name']} es TEXT y NOT NULL",
                        'recommendation': 'Considerar permitir NULL o usar VARCHAR con límite'
                    })
        
        return anomalies
