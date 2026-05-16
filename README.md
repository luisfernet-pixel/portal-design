# Portal Design

Plataforma web MVP para seguimiento de proyectos de diseno de oficinas/interiores.
Servicio: **Gestion Digital de Proyectos**.

## Stack
- Next.js App Router + TypeScript
- Supabase (Auth, Database, Storage)
- CSS propio (sin librerias de UI extras)

## Rutas principales
- `/login`
- `/admin`
- `/admin/clientes/nuevo`
- `/admin/proyectos/nuevo`
- `/admin/proyectos/[id]`
- `/cliente`
- `/cliente/proyectos/[id]`

## Instalacion local
1. Instalar dependencias:
```bash
npm install
```
2. Configurar variables:
```bash
cp .env.example .env.local
```
3. Completar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necesaria para crear clientes desde `/admin/clientes/nuevo`)

Opcional (acceso rapido temporal en login):
- `NEXT_PUBLIC_DEMO_ADMIN_EMAIL`
- `NEXT_PUBLIC_DEMO_ADMIN_PASSWORD`
- `NEXT_PUBLIC_DEMO_CLIENT_EMAIL`
- `NEXT_PUBLIC_DEMO_CLIENT_PASSWORD`

4. Ejecutar:
```bash
npm run dev
```

## Base de datos y RLS
1. Ejecutar SQL completo en Supabase SQL Editor:
- `supabase/schema.sql`

2. (Opcional) revisar seed:
- `supabase/seed.sql`

El script crea:
- tablas del MVP
- fases iniciales
- politicas RLS para admin/cliente
- buckets de storage:
  - `project-gallery`
  - `project-documents`
  - `project-updates`

## Notas de seguridad Storage (MVP)
Se habilita lectura para usuarios autenticados para simplificar inicio.
Pendiente recomendado en hardening:
- restringir acceso por proyecto y path por usuario en `storage.objects`.
