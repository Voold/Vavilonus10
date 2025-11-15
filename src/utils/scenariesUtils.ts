import type { TabKey } from "../store/useChatStore"

/**
 * Подставляет собранные параметры в шаблон промпта.
 * @param template Строковый шаблон промпта (например, "Проанализируй ${param1} и ${param2}")
 * @param params Собранные параметры
 */
export const generateFinalPrompt = (template: string, params: Record<string, string>): string => {
    let prompt = template;
    for (const key in params) {
        // Используем регулярное выражение для поиска и замены ${key}
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(regex, params[key]);
    }
    return prompt;
};

// Имитация загрузки JSON данных
// В реальном приложении это будет fetch('/api/scenarios/finance')
export const fetchScenarios = async (tab: TabKey) => {
    switch (tab) {
        case 'finance':
            // Имитация импорта financeScenarios.json
            const financeData = await import('../scenaries/financeScenarios.json'); 
            return financeData.default || financeData;
        case 'marketing':
            // Имитация импорта marketingScenarios.json
            const marketingData = await import('../scenaries/marketingScenarios.json');
            return marketingData.default || marketingData;
        case 'management':
            // Имитация импорта managementScenarios.json
            const managementData = await import('../scenaries/managementScenarios.json');
            return managementData.default || managementData;
        default:
            return [];
    }
};