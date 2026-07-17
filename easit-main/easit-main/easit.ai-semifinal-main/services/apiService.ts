import type { User, Conversation } from '../types.js';
import { supabase } from './supabaseClient.js';
import { getEncryptionKey, encryptConversation, decryptConversation, isEncrypted } from './encryption.js';

export interface ApiKey { id: string; key_value: string; created_at: string; }

// Helper for our internal engine to get an API key
export function getApiKey(): string {
    const localData = localStorage.getItem('easit-api-key');
    if (localData) return localData;
    return 'easit_live_guest'; // Fallback for MVP if not logged in
}

const apiService = {
    async googleAuthWithToken(idToken: string): Promise<{ token: string; user: User }> {
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
        });

        if (error) throw new Error(error.message);

        // Auto-initialize E2E encryption key
        await getEncryptionKey();

        return {
            token: data.session?.access_token || '',
            user: {
                name: data.user?.user_metadata?.name || data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'User',
                email: data.user?.email || '',
                picture: data.user?.user_metadata?.avatar_url || data.user?.user_metadata?.picture
            }
        };
    },
    
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        
        // Auto-initialize E2E encryption key
        await getEncryptionKey();

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
            options: { data: { name } }
        });
        if (error) throw new Error(error.message);
        
        // Auto-initialize E2E encryption key
        await getEncryptionKey();

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
             // Guest mode
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
        
        const key = await getEncryptionKey();
        const results: Conversation[] = [];

        for (const row of data) {
            let messages = row.messages;
            let encrypted = false;

            if (isEncrypted(messages)) {
                try {
                    messages = await decryptConversation(messages, key);
                    encrypted = true;
                } catch (e) {
                    console.warn(`[API] Failed to decrypt conversation ${row.id}`, e);
                    messages = []; // Unreadable without key
                }
            }

            results.push({
                id: row.id,
                title: row.title,
                messages,
                createdAt: row.created_at,
                encrypted
            });
        }
        
        return results;
    },
    
    async saveConversation(conversation: Conversation): Promise<void> {
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session) {
            // Guest mode
            const localData = localStorage.getItem('easit-guest-conversations');
            if (localData) {
                try {
                    const convs: Conversation[] = JSON.parse(localData);
                    const index = convs.findIndex(c => c.id === conversation.id);
                    if (index >= 0) convs[index] = conversation;
                    else convs.unshift(conversation);
                    localStorage.setItem('easit-guest-conversations', JSON.stringify(convs));
                } catch(e) {}
            }
            return;
        }

        // Supabase mode (E2E Encrypted)
        const key = await getEncryptionKey();
        const encryptedMessages = await encryptConversation(conversation.messages, key);

        const { error } = await supabase
            .from('conversations')
            .upsert({
                id: conversation.id.startsWith('conv-') ? undefined : conversation.id,
                user_id: session.session.user.id,
                title: conversation.title,
                messages: encryptedMessages, // Send the encrypted blob
                created_at: conversation.createdAt
            });
            
        if (error) console.error("Failed to save conversation to cloud", error);
    },

    async getApiKeys(): Promise<ApiKey[]> {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return [];
        const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        
        // Store the newest key in local storage for the engine to use
        if (data && data.length > 0) {
            localStorage.setItem('easit-api-key', data[0].key_value);
        }
        
        return data as ApiKey[];
    },

    async generateApiKey(): Promise<ApiKey> {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error('Must be logged in to generate API key');
        
        // Use cryptographically secure random UUID
        const keyValue = `easit_live_${crypto.randomUUID().replace(/-/g, '')}`;
        
        const { data, error } = await supabase.from('api_keys').insert({
            user_id: session.session.user.id,
            key_value: keyValue
        }).select().single();
        
        if (error) throw new Error(error.message);
        
        localStorage.setItem('easit-api-key', keyValue);
        return data as ApiKey;
    },

    async deleteApiKey(id: string): Promise<void> {
        const { error } = await supabase.from('api_keys').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }
};

export default apiService;