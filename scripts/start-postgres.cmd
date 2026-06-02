@echo off
REM Arranca PostgreSQL portable del proyecto (idempotente: si ya corre, no hace nada dañino).
"D:\PROYECTO_IA\.pg\pgsql\bin\pg_ctl.exe" -D "D:\PROYECTO_IA\.pgdata" -o "-p 5432" -l "D:\PROYECTO_IA\.pgdata\server.log" start
