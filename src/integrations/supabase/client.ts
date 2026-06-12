/**
 * GDU Staff Management Portal - Custom Supabase Proxy Client
 * Redirects all database queries, authentication, storage, and function calls to the local PHP MySQLi backend.
 */

class SupabaseQueryBuilder {
  private tableName: string;
  private method: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectCols: string = '*';
  private insertData: any[] | null = null;
  private updateData: any | null = null;
  private filters: { type: string; column: string; value: any }[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    this.method = 'select';
    this.selectCols = columns;
    return this;
  }

  insert(data: any[] | any) {
    this.method = 'insert';
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: any) {
    this.method = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.method = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ type: 'like', column, value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  is(column: string, value: null | boolean) {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute() {
    try {
      const token = localStorage.getItem('gdu_auth_token');
      const response = await fetch('/api/db.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          table: this.tableName,
          method: this.method,
          selectCols: this.selectCols,
          insertData: this.insertData,
          updateData: this.updateData,
          filters: this.filters,
          orders: this.orders,
          limitCount: this.limitCount,
          isSingle: this.isSingle,
          isMaybeSingle: this.isMaybeSingle,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: { message: `HTTP error ${response.status}: ${errorText}` } };
      }
      
      const result = await response.json();
      if (result.success) {
        return { data: result.data, error: null };
      } else {
        return { data: null, error: result.error || { message: result.message || 'Database query failed' } };
      }
    } catch (e: any) {
      console.error('[Supabase Proxy] Query execution error:', e);
      return { data: null, error: { message: e.message || 'Network error' } };
    }
  }

  // Thenable interface implementation so it can be awaited directly
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

let authChangeListeners: Array<(event: string, session: any) => void> = [];

function triggerAuthChange(event: string, session: any) {
  authChangeListeners.forEach(listener => {
    try {
      listener(event, session);
    } catch (e) {
      console.error('[Supabase Proxy] Error in auth change listener:', e);
    }
  });
}

export const supabase = {
  from(tableName: string) {
    return new SupabaseQueryBuilder(tableName);
  },

  auth: {
    async getSession() {
      const sessionStr = localStorage.getItem('gdu_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          return { data: { session }, error: null };
        } catch (e) {}
      }
      return { data: { session: null }, error: null };
    },

    async getUser() {
      const sessionStr = localStorage.getItem('gdu_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          return { data: { user: session.user }, error: null };
        } catch (e) {}
      }
      return { data: { user: null }, error: null };
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const response = await fetch('/api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email, password }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
          const session = result.data.session;
          localStorage.setItem('gdu_session', JSON.stringify(session));
          localStorage.setItem('gdu_auth_token', session.access_token);
          
          triggerAuthChange('SIGNED_IN', session);
          return { data: { session, user: session.user }, error: null };
        } else {
          return { data: { session: null, user: null }, error: { message: result.message || 'Login failed' } };
        }
      } catch (e: any) {
        return { data: { session: null, user: null }, error: { message: e.message || 'Network login error' } };
      }
    },

    async signOut() {
      localStorage.removeItem('gdu_session');
      localStorage.removeItem('gdu_auth_token');
      triggerAuthChange('SIGNED_OUT', null);
      return { error: null };
    },

    async resetPasswordForEmail(email: string, options?: any) {
      try {
        const response = await fetch('/api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'forgot-password', email }),
        });
        
        const result = await response.json();
        if (result.success) {
          return { data: {}, error: null };
        } else {
          return { data: null, error: { message: result.message || 'Reset request failed' } };
        }
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },

    async updateUser({ password }: any) {
      try {
        const token = localStorage.getItem('gdu_auth_token');
        const searchParams = new URLSearchParams(window.location.search);
        const resetToken = searchParams.get('token') || '';
        
        const response = await fetch('/api/auth.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ action: 'update-password', password, token: resetToken }),
        });
        
        const result = await response.json();
        if (result.success) {
          return { data: { user: result.data.user }, error: null };
        } else {
          return { data: null, error: { message: result.message || 'Update failed' } };
        }
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authChangeListeners.push(callback);
      
      const sessionStr = localStorage.getItem('gdu_session');
      let session = null;
      if (sessionStr) {
        try {
          session = JSON.parse(sessionStr);
        } catch (e) {}
      }
      
      setTimeout(() => {
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe() {
              authChangeListeners = authChangeListeners.filter(l => l !== callback);
            }
          }
        }
      };
    }
  },

  storage: {
    from(bucketName: string) {
      return {
        async upload(filePath: string, file: File, options?: any) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', bucketName);
            formData.append('path', filePath);
            
            const token = localStorage.getItem('gdu_auth_token');
            const response = await fetch('/api/upload.php', {
              method: 'POST',
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
              body: formData,
            });
            
            const result = await response.json();
            if (result.success) {
              return { data: { path: filePath }, error: null };
            } else {
              return { data: null, error: { message: result.message || 'File upload failed' } };
            }
          } catch (e: any) {
            return { data: null, error: { message: e.message } };
          }
        },
        
        getPublicUrl(filePath: string) {
          // Generate relative public link matching backend uploads structure
          const cleanPath = filePath.replace(/\\/g, '/');
          const publicUrl = `/uploads/${bucketName}/${cleanPath}`.replace(/\/+/g, '/');
          return { data: { publicUrl } };
        }
      };
    }
  },

  functions: {
    async invoke(functionName: string, options: any = {}) {
      if (functionName === 'admin-auth') {
        try {
          const token = localStorage.getItem('gdu_auth_token');
          const response = await fetch('/api/admin-auth.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(options.body),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            return { data: null, error: { message: `HTTP ${response.status}: ${errorText}` } };
          }
          
          const result = await response.json();
          if (result.success) {
            return { data: result.user || result, error: null };
          } else {
            return { data: null, error: { message: result.error || result.message || 'Operation failed' } };
          }
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      }
      return { data: null, error: { message: `Function ${functionName} not supported` } };
    }
  }
};
