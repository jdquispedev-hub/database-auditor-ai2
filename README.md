# 🚀 AI Database Auditor & Documentation System

Un sistema avanzado y profesional para la auditoría, documentación y conversión de estructuras de bases de datos utilizando Inteligencia Artificial (**OpenAI GPT-4o-mini**). Este proyecto está diseñado para arquitectos de datos, contadores y desarrolladores que necesitan una visión crítica y detallada de sus esquemas de datos.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT--4o--mini-orange.svg)

---

## ✨ Características Principales

### 1. 🔍 Auditoría Técnica & Contable
Actúa como un **Auditor Senior**. El sistema no solo documenta, sino que crítica.
- **Barra de Cumplimiento Animada**: Un medidor visual `[████████░░]` que indica el nivel de normalización e integridad.
- **Crítica Obligatoria**: Análisis honesto sobre tipos de datos, llaves foráneas y estándares contables internacionales.
- **Diccionario de Datos Premium**: Tablas limpias y estructuradas generadas por IA.

### 2. 📊 Diagramas ER Interactivos (Mermaid.js)
Visualiza tu base de datos al instante.
- **Generación Automática**: Crea diagramas Entidad-Relación basados en el archivo subido.
- **Controles de Zoom**: Navega fácilmente por esquemas complejos.
- **Descarga SVG**: Guarda tus diagramas para reportes técnicos.

### 3. 🔄 Convertidor de Esquemas Multi-formato
Transforma tu estructura de datos a cualquier tecnología moderna.
- **Formatos de Destino**: SQL (MySQL/PostgreSQL), MongoDB (Mongoose), Prisma Schema, GraphQL SDL, JSON Schema.
- **Lógica de Conversión**: Mantiene relaciones, tipos de datos y añade comentarios de diseño.

### 4. 📂 Soporte Masivo de Formatos
Acepta prácticamente cualquier archivo relacionado con datos:
- **Relacionales**: `.sql`, `.dbml`, `.txt`
- **No Relacionales**: `.json`, `.yaml`, `.yml`
- **Modernos**: `.prisma`, `.graphql`
- **Código**: `.js`, `.ts` (Modelos)
- **Tabulares**: `.csv`, `.xlsx` (Excel)

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js & Express.
- **IA**: OpenAI API (GPT-4o-mini).
- **Diagramación**: Mermaid.js.
- **Procesamiento de Excel**: Library `xlsx`.
- **Frontend**: Vanilla JavaScript, CSS Moderno (Glassmorphism), Marked.js.

---

## 🚀 Instalación y Configuración

### 1. Requisitos Previos
- Node.js v16 o superior.
- Una cuenta de [OpenAI](https://platform.openai.com/) y una API Key válida.

### 2. Instalar
```bash
cd Doc
npm install
```

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```env
OPENAI_API_KEY=tu_api_key_aqui
PORT=3000
```

### 4. Iniciar el Sistema
```bash
# Modo producción
npm start

# Modo desarrollo (si tienes nodemon)
npm run dev
```
Visita `http://localhost:3000` en tu navegador.

---

## 📖 Cómo Usar el Sistema

1. **Sube tu archivo**: Arrastra o selecciona tu archivo de base de datos (ej: `schema.sql`, `data.json`, `Reporte.xlsx`).
2. **Auditoría**: Revisa la pestaña "Documentación IA" para ver el análisis crítico y la barra de cumplimiento.
3. **Visualiza**: Ve a "Diagrama ER" para ver la estructura gráfica. Usa el zoom si el esquema es grande.
4. **Convierte**: Si necesitas moverte a otra tecnología, usa la pestaña "Convertidor", elige el formato y obtén tu código.
5. **Descarga/Imprime**: Al final de los resultados, encontrarás botones para descargar la documentación en formato Word (.doc), PDF (.pdf) o imprimirla directamente.

---

## 🛡️ Seguridad y Privacidad
- Los archivos subidos se procesan temporalmente en la carpeta `uploads/`.
- Se eliminan automáticamente del servidor inmediatamente después del análisis para garantizar la privacidad de tus datos.
- El sistema no almacena logs de los esquemas analizados.
- La aplicación funciona completamente offline una vez instalada (excepto por las llamadas a OpenAI API).

---

## 📄 Licencia
Este proyecto está bajo la Licencia **MIT**. Siéntete libre de usarlo, modificarlo y compartirlo.

