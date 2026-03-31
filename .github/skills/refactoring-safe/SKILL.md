---
name: refactoring-safe
description: Refactoriza código preservando comportamiento observable y minimizando riesgo de regresión.
trigger:
  - Cuando se mejora diseño interno sin cambiar reglas de negocio
  - Cuando hay deuda técnica, duplicación o complejidad accidental
---

# Refactoring Safe

## Cuándo usar
Para simplificar estructura, nombres o responsabilidades manteniendo la misma salida funcional.

## Procedimiento
1. Definir comportamiento actual que debe permanecer intacto.
2. Crear lista de invariantes (endpoints, DTOs, eventos, rutas, mensajes clave).
3. Refactorizar en pasos pequeños y reversibles.
4. Mantener firmas públicas y contratos salvo autorización explícita.
5. Ejecutar pruebas focalizadas tras cada bloque.
6. Validar cobertura de casos críticos del módulo.
7. Documentar qué se mejoró y qué quedó pendiente.

## Outputs esperados
- Código más mantenible con mismo comportamiento.
- Riesgo de regresión reducido.
- Evidencia de invariantes preservadas.

## Ejemplos de uso
- “Extraer lógica repetida en adaptadores HTTP de frontend”.
- “Separar responsabilidades de un use case grande en backend”.

## Anti-patrones (NO usar para)
- Introducir nuevas features disfrazadas de refactor.
- Cambiar contratos externos sin plan de migración.
