export interface Company {
    id: number;
    name: string;
    description?: string;
}

export interface Expense {
    id: number;
    description: string;
    amount: number;
    date: string;
    isPaid: boolean;
    isFixed: boolean;
    companyId: number;
    company?: Company;
}

export interface ForecastItem {
    id: number;
    description: string;
    baseAmount: number;
    escalationPercent: number;
    type: 'sales' | 'cos' | 'expenses';
    overridesJson?: string;
    companyId: number;
}
