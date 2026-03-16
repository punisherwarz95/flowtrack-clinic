
-- Revertir estado de antropometría a pendiente para que el clínico pueda ingresar los datos
UPDATE atencion_examenes 
SET estado = 'pendiente'
WHERE id = '29616701-a51e-40d3-8c99-1eca8f4149bf';

-- Limpiar los datos para que se puedan re-ingresar correctamente
UPDATE examen_resultados 
SET valor = '{"peso":"","talla":"","imc":"","imc_clasificacion":"","pgc":"","pgc_clasificacion":"","pulso":"","pa_sistolica_1":"","pa_diastolica_1":"","pa_sistolica_2":"","pa_diastolica_2":"","pa_sistolica_3":"","pa_diastolica_3":"","pa_alerta":false,"pa_timer_inicio":null,"saturacion_o2":"","hemoglucotest":"","sexo":"","edad":"42","diabetes":"no","fumador":"no","colesterol_total":"","colesterol_hdl":"","framingham_puntos":"","framingham_riesgo":"","framingham_clasificacion":""}'
WHERE id = '7f010ae9-9ba5-4cc8-b8e6-bb0705c7d88f';
