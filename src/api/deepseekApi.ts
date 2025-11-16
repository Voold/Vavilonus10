/**
 * Отправляет готовый промпт в DeepSeek API (через ваш собственный бэкенд-прокси).
 * @param finalPrompt - Сформированный итоговый промпт для модели.
 * @returns Promise<string> - Ответ от модели в виде строки.
 */
export async function getDeepseekResponse(finalPrompt: string): Promise<string> {
    // !!! ВАЖНО: Используйте ваш собственный бэкенд-прокси
    // для безопасной передачи API-ключа и выполнения запроса.
    const API_ENDPOINT = '/api/deepseek-chat'; 
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // API-ключ DeepSeek должен передаваться здесь, 
                // но его должен добавить ваш бэкенд-прокси, а не фронтенд!
                // 'Authorization': 'Bearer YOUR_DEEPSEEK_API_KEY_SHOULD_BE_ON_BACKEND'
            },
            body: JSON.stringify({
                model: 'deepseek-chat', // Выберите нужную модель DeepSeek
                messages: [
                    { role: 'user', content: finalPrompt }
                ],
                // Добавьте другие параметры, если нужно (например, temperature)
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('DeepSeek API Error Response:', errorData);
            throw new Error(`DeepSeek API вернул ошибку: ${response.status} - ${errorData.message || 'Неизвестная ошибка'}`);
        }

        const data = await response.json();
        
        // В зависимости от структуры ответа DeepSeek, 
        // извлекаем содержимое ответа. 
        // Это примерная структура:
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            return "Модель не предоставила ответа.";
        }

    } catch (error) {
        console.error('Ошибка при вызове DeepSeek API:', error);
        return `[Ошибка API]: Не удалось получить ответ от DeepSeek. Проверьте консоль.`;
    }
}