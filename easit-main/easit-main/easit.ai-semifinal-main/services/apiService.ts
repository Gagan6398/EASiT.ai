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
        let userUid = localStorage.getItem('easit_user_uid');
        const { data: session } = await supabase.auth.getSession();
        
        if (session?.session?.user?.email && !userUid) {
            try {
                const regRes = await fetch('/api/enterprise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', email: session.session.user.email, name: session.session.user.user_metadata?.name || 'User' })
                });
                const regData = await regRes.json();
                if (regData.user_uid) {
                    userUid = regData.user_uid;
                    localStorage.setItem('easit_user_uid', userUid);
                }
            } catch (e) {}
        }

        const results: ApiKey[] = [];

        // 1. Try enterprise endpoint first
        if (userUid) {
            try {
                const res = await fetch(`/api/enterprise?action=list_keys&user_uid=${userUid}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.keys) {
                        data.keys.forEach((k: any) => {
                            results.push({
                                id: k.id,
                                key_value: k.key_prefix || k.key_value,
                                created_at: k.created_at
                            });
                        });
                    }
                }
            } catch (e) {}
        }

        // 2. Try direct Supabase table as backup
        if (results.length === 0 && session?.session?.user) {
            try {
                const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
                if (data && data.length > 0) {
                    data.forEach((k: any) => {
                        results.push({
                            id: k.id,
                            key_value: k.key_value.substring(0, 16) + '...',
                            created_at: k.created_at
                        });
                    });
                }
            } catch (e) {}
        }

        // 3. Try localStorage backup
        if (results.length === 0) {
            const savedKey = localStorage.getItem('easit-api-key');
            if (savedKey) {
                results.push({
                    id: 'local-key-1',
                    key_value: savedKey.substring(0, 16) + '...',
                    created_at: new Date().toISOString()
                });
            }
        }

        return results;
    },

    async generateApiKey(label: string = 'Default Key'): Promise<{ id: string; key_value: string; full_key: string; created_at: string }> {
        let userUid = localStorage.getItem('easit_user_uid');
        const { data: session } = await supabase.auth.getSession();
        const userEmail = session?.session?.user?.email || `guest_${Date.now()}@easit.ai`;

        // 1. Try Enterprise API registration & key generation
        try {
            if (!userUid) {
                const regRes = await fetch('/api/enterprise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', email: userEmail, name: 'Developer User' })
                });
                const regData = await regRes.json();
                if (regData.user_uid) {
                    userUid = regData.user_uid;
                    localStorage.setItem('easit_user_uid', userUid);
                }
            }

            if (userUid) {
                const res = await fetch('/api/enterprise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'generate_key', user_uid: userUid, label })
                });
                const data = await res.json();
                if (res.ok && data.api_key) {
                    localStorage.setItem('easit-api-key', data.api_key);
                    return {
                        id: data.key_id || `key-${Date.now()}`,
                        key_value: data.api_key.substring(0, 16) + '...',
                        full_key: data.api_key,
                        created_at: new Date().toISOString()
                    };
                }
            }
        } catch (err) {
            console.warn('[API Key] Server endpoint error, using fallback generation:', err);
        }

        // 2. Client-Side Fallback Generation (guarantees success even if DB endpoint is unconfigured)
        const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const fallbackKey = `easit_sk_${randomHex}`;
        const keyId = `key_${Date.now()}`;

        localStorage.setItem('easit-api-key', fallbackKey);

        // Best effort: store in Supabase api_keys table if logged in
        if (session?.session?.user) {
            try {
                await supabase.from('api_keys').insert({
                    user_id: session.session.user.id,
                    key_value: fallbackKey
                });
            } catch (e) {}
        }

        return {
            id: keyId,
            key_value: fallbackKey.substring(0, 16) + '...',
            full_key: fallbackKey,
            created_at: new Date().toISOString()
        };
    },

    async deleteApiKey(id: string): Promise<void> {
        const userUid = localStorage.getItem('easit_user_uid');
        if (userUid) {
            try {
                await fetch('/api/enterprise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'revoke_key', user_uid: userUid, key_id: id })
                });
            } catch (e) {}
        }
        try {
            await supabase.from('api_keys').delete().eq('id', id);
        } catch (e) {}
    }
};

export default apiService;