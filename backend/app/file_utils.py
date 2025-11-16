import os
import pandas as pd
from docx import Document
import xml.etree.ElementTree as ET
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def read_docx_file(file_path: str) -> str:
    """Чтение DOCX файла и извлечение текста"""
    try:
        doc = Document(file_path)
        text = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text.append(paragraph.text)
        return "\n".join(text)
    except Exception as e:
        logger.error(f"Ошибка чтения DOCX файла {file_path}: {e}")
        return ""

def read_xlsx_file(file_path: str) -> str:
    """Чтение XLSX файла и извлечение данных"""
    try:
        excel_file = pd.ExcelFile(file_path)
        content = []
        
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            content.append(f"--- Лист: {sheet_name} ---")
            
            for col in df.columns:
                content.append(f"{col}: {', '.join(map(str, df[col].dropna().values))}")
        
        return "\n".join(content)
    except Exception as e:
        logger.error(f"Ошибка чтения XLSX файла {file_path}: {e}")
        return ""

def read_svg_file(file_path: str) -> str:
    """Чтение SVG файла и извлечение текста"""
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        texts = []
        for elem in root.iter():
            if elem.text and elem.text.strip():
                texts.append(elem.text.strip())
            if elem.tail and elem.tail.strip():
                texts.append(elem.tail.strip())
        
        return " ".join(texts)
    except Exception as e:
        logger.error(f"Ошибка чтения SVG файла {file_path}: {e}")
        return ""

def load_company_documents(company_id: str) -> str:
    """Загрузка и обработка всех документов компании"""
    from .database import get_company_docs_dir
    
    docs_dir = get_company_docs_dir(company_id)
    documents_content = []
    
    if not os.path.exists(docs_dir):
        return ""
    
    for filename in os.listdir(docs_dir):
        file_path = os.path.join(docs_dir, filename)
        
        if filename.endswith('.docx'):
            content = read_docx_file(file_path)
            if content:
                documents_content.append(f"ДОКУМЕНТ: {filename}\n{content}\n")
        
        elif filename.endswith('.xlsx'):
            content = read_xlsx_file(file_path)
            if content:
                documents_content.append(f"ТАБЛИЦА: {filename}\n{content}\n")
        
        elif filename.endswith('.svg'):
            content = read_svg_file(file_path)
            if content:
                documents_content.append(f"ГРАФИКА: {filename}\n{content}\n")
        
        elif filename.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if content:
                    documents_content.append(f"ТЕКСТОВЫЙ ФАЙЛ: {filename}\n{content}\n")
        elif filename.endswith('.pdf'):
            # Для PDF можно добавить библиотеку PyPDF2 или pdfplumber
            documents_content.append(f"PDF ФАЙЛ: {filename}\n[Содержимое PDF файла]\n")
    
    return "\n".join(documents_content)