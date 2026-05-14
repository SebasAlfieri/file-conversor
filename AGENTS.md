# AGENTS.md

## Stack

- Next.js 16
- TypeScript 5
- App Router
- Tailwind

## Commands

- dev: `yarn dev`
- build: `yarn build`
- lint: `yarn lint`

## Rules

- Priorizar el uso de herramientas de next para maximizar rendimiento
- Usar "use client" solo cuando sea necesario
- No usar useEffect innecesariamente
- Evitar renderizados duplicados
- Mantener componentes pequeños y reutilizables
- Preferir server components
- Mantener imports absolutos con @/
- No crear archivos >300 líneas en lo posible
- usa yarn add en caso de instalar librerias, no npm

## TypeScript

- Usar archivo /types/model.ts como ubicacion del modelo de types
- No usar `any`
- Tipar props explícitamente
- Preferir `type` sobre `interface`

## Components

- Un componente por carpeta

## Before finishing

- Ejecutar lint
- Verificar tipos

## Imports

- Usar imports absolutos con `@/`
- Ordenar imports automáticamente
- No usar imports relativos profundos (`../../../`)

## Data Fetching

- Preferir async server components
- Usar server actions cuando tenga sentido
- Evitar fetches en cliente si no son necesarios
- Cachear requests cuando aplique

## Performance

- Optimizar imágenes con next/image
- Evitar rerenders innecesarios
- Lazy load para componentes pesados
- No crear funciones inline grandes en JSX

## Animations

- Usar Framer Motion
- Evitar animaciones pesadas
- No animar width/height si puede usarse transform

## State

- Preferir estado local
- No usar context innecesariamente
- Zustand para estado global
- Mantener stores pequeñas

## Code Quality

- No dejar console.logs
- No comentar código muerto
- Mantener archivos debajo de 300 líneas
- Extraer lógica compleja a hooks

## Accessibility

- Todos los botones deben tener aria-label si no tienen texto
- Inputs deben tener label
- Imágenes decorativas con alt=""

## AI Instructions

- Antes de crear un archivo nuevo, verificar si ya existe uno similar
- No instalar librerías sin necesidad
- Reutilizar componentes existentes
- Mantener el estilo visual actual del proyecto
- No refactorizar código no relacionado
- Hacer cambios mínimos y seguros
