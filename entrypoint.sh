#!/bin/bash
# entrypoint.sh

echo "🚀 Запуск ИИ модели..."

# Запускаем Ollama в фоне
echo "📥 Запуск Ollama сервера..."
ollama serve &

# Ждем запуска Ollama
sleep 10

# Скачиваем модель если её нет
if ! ollama list | grep -q "'qwen2.5:0.5b-instruct"; then
    echo "📦 Скачивание модели..."
    ollama pull qwen2.5:0.5b-instruct
fi