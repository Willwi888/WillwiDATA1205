import { supabase } from './supabaseClient';

export interface User {
    id?: string;
    email: string;
    name: string;
    credits: number;
    is_member: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Transaction {
    id?: string;
    transaction_id: string;
    user_email: string;
    type: 'production' | 'donation';
    amount: number;
    price_paid?: number;
    details?: string;
    created_at?: string;
}

export const userService = {
    // 新增或更新用戶
    async upsertUser(user: User): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    email: user.email,
                    name: user.name,
                    credits: user.credits,
                    is_member: user.is_member,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'email'
                });

            if (error) {
                console.error('新增/更新用戶失敗:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('新增/更新用戶失敗:', error);
            return false;
        }
    },

    // 獲取用戶
    async getUser(email: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                console.error('獲取用戶失敗:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('獲取用戶失敗:', error);
            return null;
        }
    },

    // 獲取所有用戶
    async getAllUsers(): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('獲取所有用戶失敗:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('獲取所有用戶失敗:', error);
            return [];
        }
    },

    // 更新用戶點數
    async updateCredits(email: string, credits: number): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('users')
                .update({ credits, updated_at: new Date().toISOString() })
                .eq('email', email);

            if (error) {
                console.error('更新點數失敗:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('更新點數失敗:', error);
            return false;
        }
    },

    // 新增交易紀錄
    async addTransaction(transaction: Transaction): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('transactions')
                .insert({
                    transaction_id: transaction.transaction_id,
                    user_email: transaction.user_email,
                    type: transaction.type,
                    amount: transaction.amount,
                    price_paid: transaction.price_paid,
                    details: transaction.details
                });

            if (error) {
                console.error('新增交易失敗:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('新增交易失敗:', error);
            return false;
        }
    },

    // 獲取所有交易
    async getAllTransactions(): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('獲取交易失敗:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('獲取交易失敗:', error);
            return [];
        }
    },

    // 獲取特定用戶的交易
    async getUserTransactions(email: string): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_email', email)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('獲取用戶交易失敗:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('獲取用戶交易失敗:', error);
            return [];
        }
    }
};
