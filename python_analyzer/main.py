#!/usr/bin/env python3
import os
import sys
import warnings

# Suprimir TODAS las advertencias y logs ruidosos antes de importar nada más
warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['QT_LOGGING_RULES'] = '*.debug=false;*.warning=false'

# Configurar backend de Matplotlib para que no intente abrir ventanas (entorno servidor)
import matplotlib
matplotlib.use('Agg')

import argparse
import json
from pathlib import Path

# Importar analizadores
try:
    from analyzers.sql_analyzer import SQLAnalyzer
    from analyzers.nosql_analyzer import NoSQLAnalyzer
    from analyzers.diagram_generator import DiagramGenerator
    from analyzers.schema_converter import SchemaConverter
except ImportError as e:
    print(json.dumps({
        'success': False, 
        'error': f"Faltan dependencias de Python: {str(e)}. Por favor ejecuta: pip install sqlglot pandas matplotlib networkx pyyaml jsonschema"
    }))
    sys.exit(0) # Salida limpia para que el server capture el JSON

class DatabaseAnalyzer:
    def __init__(self):
        self.sql_analyzer = SQLAnalyzer()
        self.nosql_analyzer = NoSQLAnalyzer()
        self.diagram_generator = DiagramGenerator()
        self.schema_converter = SchemaConverter()
    
    def analyze_file(self, file_path: str) -> dict:
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
            
            file_extension = file_path.suffix.lower()
            
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            result = {
                'fileName': file_path.name,
                'fileType': file_extension,
                'success': True,
                'analysis': {}
            }
            
            if file_extension in ['.sql', '.txt']:
                result['analysis'] = self._analyze_sql(content)
            elif file_extension == '.json':
                result['analysis'] = self._analyze_json(content)
            elif file_extension in ['.yaml', '.yml']:
                result['analysis'] = self._analyze_yaml(content)
            elif file_extension in ['.xlsx', '.xls']:
                result['analysis'] = self._analyze_excel(file_path)
            else:
                raise ValueError(f"Tipo de archivo no soportado: {file_extension}")
            
            # Generar diagrama ER
            result['analysis']['diagram'] = self.diagram_generator.generate_er_diagram(
                result['analysis']['schema']
            )
            
            # Generar conversiones básicas
            result['analysis']['conversions'] = self.schema_converter.generate_conversions(
                result['analysis']['schema']
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fileName': file_path.name if 'file_path' in locals() else 'unknown'
            }
    
    def _analyze_sql(self, content: str) -> dict:
        schema = self.sql_analyzer.parse_sql(content)
        return {
            'schema': schema,
            'type': 'sql',
            'validation': self.sql_analyzer.validate_schema(schema),
            'metrics': self.sql_analyzer.calculate_metrics(schema),
            'anomalies': self.sql_analyzer.detect_anomalies(schema)
        }
    
    def _analyze_json(self, content: str) -> dict:
        schema = self.nosql_analyzer.parse_json(content)
        return {
            'schema': schema,
            'type': 'nosql',
            'validation': self.nosql_analyzer.validate_schema(schema),
            'metrics': self.nosql_analyzer.calculate_metrics(schema),
            'anomalies': self.nosql_analyzer.detect_anomalies(schema)
        }
    
    def _analyze_yaml(self, content: str) -> dict:
        schema = self.nosql_analyzer.parse_yaml(content)
        return {
            'schema': schema,
            'type': 'nosql',
            'validation': self.nosql_analyzer.validate_schema(schema),
            'metrics': self.nosql_analyzer.calculate_metrics(schema),
            'anomalies': self.nosql_analyzer.detect_anomalies(schema)
        }
    
    def _analyze_excel(self, file_path: Path) -> dict:
        schema = self.nosql_analyzer.parse_excel(file_path)
        return {
            'schema': schema,
            'type': 'excel',
            'validation': self.nosql_analyzer.validate_schema(schema),
            'metrics': self.nosql_analyzer.calculate_metrics(schema),
            'anomalies': self.nosql_analyzer.detect_anomalies(schema)
        }

def main():
    parser = argparse.ArgumentParser(description='Analizador de Bases de Datos con Python')
    parser.add_argument('--file', required=True, help='Ruta del archivo a analizar')
    args = parser.parse_args()
    
    analyzer = DatabaseAnalyzer()
    result = analyzer.analyze_file(args.file)
    
    # Salida JSON ÚNICA Y LIMPIA
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
