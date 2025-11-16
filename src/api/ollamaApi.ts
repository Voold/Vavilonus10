/**
 * Отправляет сформированный промпт в локальный Ollama API (Gemma 2B).
 * @param finalPrompt - Сформированный итоговый промпт для модели.
 * @returns Promise<string> - Ответ от модели в виде строки.
 */
export async function getOllamaResponse(finalPrompt: string): Promise<string> {
    // API_ENDPOINT теперь указывает на ваш Nginx прокси для Ollama
    // /model/api/generate -> это путь, который вы настроили в Nginx!
    const API_ENDPOINT = '/model/api/generate'; 
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // *** СТРУКТУРА ЗАПРОСА ДЛЯ OLLAMA ***
            body: JSON.stringify({
                // Используем gemma:2b, которую вы развернули
                model: 'gemma:2b', 
                prompt: finalPrompt, // Передаем один финальный промпт
                stream: false, // Отключаем потоковую передачу для простого ответа
                // Дополнительные параметры (опционально):
                // options: {
                //     temperature: 0.8
                // }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Ошибка Ollama' }));
            console.error('Ollama API Error Response:', errorData);
            throw new Error(`Ollama API вернул ошибку: ${response.status} - ${errorData.message || 'Неизвестная ошибка'}`);
        }

        const data = await response.json();
        
        // *** СТРУКТУРА ОТВЕТА ДЛЯ OLLAMA ***
        // Ollama возвращает { model: "...", response: "текст ответа" }
        if (data.response) {
            return data.response;
        } else {
            // Возвращаем исходный JSON, если ответ не найден (для отладки)
            return `Модель не предоставила ответа. JSON: ${JSON.stringify(data)}`;
        }

    } catch (error) {
        console.error('Ошибка при вызове Ollama API:', error);
        // Обработка ошибок сети или CORS
        return `[Ошибка API]: Не удалось получить ответ от Ollama. Проверьте консоль.`;
    }
}