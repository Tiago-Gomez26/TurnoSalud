class SupabaseService {
  constructor() {
    this.SUPABASE_URL = 'https://jqxqdjxaypcimhftwiuh.supabase.co';
    this.SUPABASE_ANON_KEY = 'sb_publishable_UygjRK05r9CZRA7TdT8P7A_HjbeCdm6';
    this.client = null;
    this.initializeService();
  }

  initializeService() {
    try {
      if (typeof window.supabase === 'undefined') {
        throw new Error('[SupabaseService] CDN de Supabase no inicializado en la ventana global.');
      }
      this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
      console.log('%c[TurnoSalud Engine] Conexión establecida correctamente con el servidor.', 'color: #008080; font-weight: bold;');
    } catch (error) {
      console.error('[SupabaseService Error Critical]:', error.message);
    }
  }

  getClient() {
    if (!this.client) {
      this.initializeService();
    }
    return this.client;
  }
}

// Global Export Singleton Engine
const systemEngine = new SupabaseService();
const supabase = systemEngine.getClient();