#!/usr/bin/env python3
"""
Analizador de Bases de Datos con Python - Sistema Híbrido
Reemplaza 80% de funcionalidades de OpenAI con librerías Python
"""

import argparse
import json
import sys
from pathlib import Path

# Importar analizadores
from analyzers.sql_analyzer import SQLAnalyzer
from analyzers.nosql_analyzer import NoSQLAnalyzer
from analyzers.diagram_generator import DiagramGenerator
from analyzers.schema_converter import SchemaConverter

class DatabaseAnalyzer:
    def __init__(self):
        self.sql_analyzer = SQLAnalyzer()
        self.nosql_analyzer = NoSQLAnalyzer()
        self.diagram_generator = DiagramGenerator()
        self.schema_converter = SchemaConverter()
    
    def analyze_file(self, file_path: str) -> dict:
        """Analiza cualquier archivo de base de datos"""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
            
            # Determinar tipo de archivo
            file_extension = file_path.suffix.lower()
            
            # Leer contenido
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            result = {
                'fileName': file_path.name,
                'fileType': file_extension,
                'success': True,
                'analysis': {}
            }
            
            # Analizar según tipo
            if file_extension in ['.sql', '.txt']:
                result['analysis'] = self._analyze_sql(content, file_extension)
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
    
    def _analyze_sql(self, content: str, file_extension: str) -> dict:
        """Analiza archivos SQL/TXT"""
        schema = self.sql_analyzer.parse_sql(content)
        
        return {
            'schema': schema,
            'type': 'sql',
            'validation': self.sql_analyzer.validate_schema(schema),
            'metrics': self.sql_analyzer.calculate_metrics(schema),
            'anomalies': self.sql_analyzer.detect_anomalies(schema)
        }
    
    def _analyze_json(self, content: str) -> dict:
        """Analiza archivos JSON/NoSQL"""
        schema = self.nosql_analyzer.parse_json(content)
        
        return {
            'schema': schema,
            'type': 'nosql',
            'validation': self.nosql_analyzer.validate_schema(schema),
            'metrics': self.nosql_analyzer.calculate_metrics(schema),
            'anomalies': self.nosql_analyzer.detect_anomalies(schema)
        }
    
    def _analyze_yaml(self, content: str) -> dict:
        """Analiza archivos YAML"""
        schema = self.nosql_analyzer.parse_yaml(content)
        
        return {
            'schema': schema,
            'type': 'nosql',
            'validation': self.nosql_analyzer.validate_schema(schema),
            'metrics': self.nosql_analyzer.calculate_metrics(schema),
            'anomalies': self.nosql_analyzer.detect_anomalies(schema)
        }
    
    def _analyze_excel(self, file_path: Path) -> dict:
        """Analiza archivos Excel"""
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
    parser.add_argument('--output', help='Archivo de salida JSON (opcional)')
    
    args = parser.parse_args()
    
    # Crear analizador y procesar archivo
    analyzer = DatabaseAnalyzer()
    result = analyzer.analyze_file(args.file)
    
    # Salida JSON
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
