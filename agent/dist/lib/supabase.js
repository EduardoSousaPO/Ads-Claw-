"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Força o carregamento do .env na raiz do agente
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ ATENÇÃO: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontradas no .env.\n👉 O agente operará as "Skills" e o "Telegram" normalmente, mas as chamadas de banco (Client fetch) poderão falhar!');
}
/**
 * Cliente Supabase com permissões Administrativas (Service Role).
 * IMPORTANTE: No AdsClaw SWAS, nós usamos o Service Role Key na aplicação *Server-Side*
 * (Background Agent). Ele terá poder de escrita e bypass do RLS para conseguir
 * gerenciar as campanhas autonomamente!
 */
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    }
});
