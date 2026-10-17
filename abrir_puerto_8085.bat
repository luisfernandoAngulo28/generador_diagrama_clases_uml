@echo off
echo =======================================================
echo Abriendo puerto 8085 en el Firewall de Windows...
echo =======================================================
netsh advfirewall firewall add rule name="Spring Boot 8085" dir=in action=allow protocol=TCP localport=8085 profile=any
echo.
echo =======================================================
echo REGLA AGREGADA CON EXITO!
echo Tu celular ya puede conectarse a http://10.89.156.209:8085
echo =======================================================
pause
