import type { User, Conversation } from '../types.ts';
export interface ApiKey { id: string; key_value: string; created_at: string; }
import { supabase } from './supabaseClient.ts';

const apiService = {
    async googleAuth(): Promise<{ token: string; user: User }> {
        // Always redirect to production URL — this is the one whitelisted in Google Cloud Console
        const productionUrl = 'https://easitai-semifinal-main.vercel.app';
        const redirectUrl = productionUrl + '/chat';
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
        if (error) throw error;
        // OAuth redirect happens automatically, so this is just a placeholder return
        return { token: 'oauth-pending', user: { name: 'Pending', email: 'pending' } };
    },
    
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        
        return {
            token: data.session?.access_token || '',
            user: {
                name: data.user?.user_metadata?.name || data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'User',
                email: data.user?.email || '',
                picture: data.user?.user_metadata?.avatar_url || data.user?.user_metadata?.picture
            }
        };
    },
    
    async signup(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { name }
            }
        });
        if (error) throw new Error(error.message);
        
        return {
            token: data.session?.access_token || '',
            user: {
                name,
                email: data.user?.email || '',
            }
        };
    },
    
    async getConversations(): Promise<Conversation[]> {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
             // Fallback for guest mode
             try {
                 const localData = localStorage.getItem('easit-guest-conversations');
                 if (localData) return JSON.parse(localData);
             } catch (e) {}
             return [];
        }

        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw new Error('Failed to load conversations: ' + error.message);
        
        return data.map((row: any) => ({
            id: row.id,
            title: row.title,
            messages: row.messages,
            createdAt: row.created_at
        }));
    },
    
    async saveConversation(conversation: Conversation): Promise<void> {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
            // Guest mode
            const localData = localStorage.getItem('easit-guest-conversations');
            if (localData) {
                try {
                    let convs: Conversation[] = JSON.parse(localData);
                    const index = convs.findIndex(c => c.id === conversation.id);
                    if (index >= 0) convs[index] = conversation;
                    else convs.unshift(conversation);
                    localStorage.setItem('easit-guest-conversations', JSON.stringify(convs));
                } catch(e) {}
            }
            return;
        }

        // Supabase mode
        const { error } = await supabase
            .from('conversations')
            .upsert({
                id: conversation.id.startsWith('conv-') ? undefined : conversation.id, // Supabase generates UUIDs
                user_id: session.session.user.id,
                title: conversation.title,
                messages: conversation.messages,
                created_at: conversation.createdAt
            });
            
        if (error) console.error("Failed to save conversation to cloud", error);
    },

    async getApiKeys(): Promise<ApiKey[]> {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return [];
        const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data as ApiKey[];
    },

    async generateApiKey(): Promise<ApiKey> {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error('Must be logged in to generate API key');
        
        const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const keyValue = `easit_live_${randomString}`;
        
        const { data, error } = await supabase.from('api_keys').insert({
            user_id: session.session.user.id,
            key_value: keyValue
        }).select().single();
        
        if (error) throw new Error(error.message);
        return data as ApiKey;
    },

    async deleteApiKey(id: string): Promise<void> {
        const { error } = await supabase.from('api_keys').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }
};

export default apiService;