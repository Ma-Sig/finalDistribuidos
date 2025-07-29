# 🧪 GUÍA DE PRUEBAS - Sistema Distribuido

## ✅ FASE 1: Verificaciones Básicas

### 1.1 Verificar Docker y Docker Compose

```powershell
docker --version
docker-compose --version
```

### 1.2 Verificar Kubernetes (si tienes kubectl)

```powershell
kubectl version --client
```

## ✅ FASE 2: Probar con Docker Compose (Desarrollo)

### 2.1 Construir y levantar servicios básicos

```powershell
cd "c:\Users\maris\OneDrive\Escritorio\finalDistribuidos"

# Construir imágenes
docker-compose build

# Levantar servicios
docker-compose up -d
```

### 2.2 Verificar que los servicios estén corriendo

```powershell
docker-compose ps
```

**Esperado:** Ver backend, frontend, base de datos corriendo

### 2.3 Probar endpoints básicos

```powershell
# Probar que el backend responda
curl http://localhost:3001

# Probar frontend (si está configurado)
curl http://localhost:3000
```

### 2.4 Verificar logs del backend

```powershell
docker-compose logs backend
```

**Esperado:**

- "Conexión exitosa a la base de datos"
- "Kafka Producer está listo"
- "Servidor iniciado"

## ✅ FASE 3: Probar Funcionalidad Completa

### 3.1 Hacer login

```powershell
# POST /login
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin\"}"
```

**Esperado:** Recibir un token JWT

### 3.2 Usar el token para crear un productor

```powershell
# Guarda el token de la respuesta anterior
$token = "tu_token_aqui"

# POST /productores
curl -X POST http://localhost:3000/productores -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "{\"id\":1,\"nombre\":\"Productor Test\"}"
```

### 3.3 Crear un pedido

```powershell
# POST /pedidos
curl -X POST http://localhost:3000/pedidos -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "{\"nombre\":\"Pizza Margherita\",\"productor_id\":1}"
```

### 3.4 Verificar logs de archivos (Sidecar Pattern)

```powershell
# Entrar al contenedor del backend
docker-compose exec backend sh

# Dentro del contenedor, verificar el archivo de logs
cat /usr/src/app/logs/backend.log
```

**Esperado:** Ver logs en formato JSON con timestamps

## ✅ FASE 4: Probar en Kubernetes (Producción)

### 4.0 Preparar imágenes Docker

```powershell
# Construir imagen del backend
cd backend
docker build -t my-backend .

# Subir imagen a Docker Hub (si quieres usar tu registro)
docker tag my-backend jcuzcoucuenca/my-backend
docker push jcuzcoucuenca/my-backend
cd ..
```

### 4.1 Iniciar Minikube y configurar addons

```powershell
# Iniciar Minikube
minikube start

# Habilitar ingress addon
minikube addons enable ingress

# Instalar NGINX Ingress Controller (alternativa)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Verificar que NGINX esté corriendo
kubectl get pods -n ingress-nginx
```

### 4.2 Aplicar ConfigMaps y Secrets

```powershell
# Aplicar configuración de base de datos
kubectl apply -f db-config.yaml
kubectl apply -f db-secret.yaml

# Aplicar configuración de Fluent Bit (Sidecar)
kubectl apply -f fluent-bit-config.yaml
```

### 4.3 Desplegar la aplicación completa

```powershell
# Desplegar backend con sidecar
kubectl apply -f deployment.yaml

# Desplegar ingress
kubectl apply -f ./k8s/backend-ingress.yaml
```

### 4.4 Verificar el despliegue

```powershell
# Verificar pods (debe mostrar 2/2 READY - backend + sidecar)
kubectl get pods

# Verificar servicios
kubectl get services

# Verificar ingress
kubectl get ingress

# Si ingress no aparece, ejecutar tunnel
minikube tunnel
```

### 4.5 Acceder al servicio

```powershell
# Opción 1: Acceso directo via minikube
minikube service backend-service

# Opción 2: Port forwarding
kubectl port-forward deployment/backend-deployment 3000:3000

# Opción 3: Via ingress (si tunnel está activo)
# Acceder via http://localhost o la IP que muestre minikube tunnel
```

### 4.6 Verificar logs del sidecar

```powershell
# Ver logs del contenedor principal (backend)
kubectl logs deployment/backend-deployment -c backend

# Ver logs del sidecar (Fluent Bit) - AQUÍ ESTÁ EL PATRÓN SIDECAR
kubectl logs deployment/backend-deployment -c fluent-bit-sidecar
```

**Esperado:** Ver logs JSON del backend siendo procesados por Fluent Bit

### 4.7 Limpiar el despliegue (cuando termines)

```powershell
# Eliminar deployment e ingress
kubectl delete -f deployment.yaml
kubectl delete -f ./k8s/backend-ingress.yaml

# Detener minikube
minikube stop
```

## ✅ FASE 5: Monitoreo Avanzado con Grafana (OPCIONAL)

### 5.1 Instalar Loki Stack con Helm

```powershell
# Agregar repositorio de Grafana
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Instalar Loki (para logs centralizados)
helm install loki grafana/loki-stack --set promtail.enabled=false

# Reenviar puerto de Grafana
kubectl port-forward svc/loki-grafana 3000:80
```

**Acceso:** http://localhost:3000 (usuario: admin, obtener password con kubectl)

## ✅ FASE 6: Verificaciones de Patrones

### 6.1 ✅ Patrón Sidecar (IMPLEMENTADO)

**¿Qué verificar?**

- [ ] Pods muestran 2/2 READY (backend + fluent-bit-sidecar)
- [ ] Logs del backend aparecen en archivo `/app/logs/backend.log`
- [ ] Fluent Bit captura y procesa los logs: `kubectl logs deployment/backend-deployment -c fluent-bit-sidecar`
- [ ] Los logs aparecen en stdout de Fluent Bit en formato JSON

### 6.2 ✅ Patrón Ambassador (IMPLEMENTADO)

**¿Qué verificar?**

- [ ] NGINX Ingress Controller funciona: `kubectl get pods -n ingress-nginx`
- [ ] Ingress rutea tráfico correctamente: `kubectl get ingress`
- [ ] El frontend se conecta al backend a través del proxy/ingress
- [ ] `minikube service backend-service` abre el servicio correctamente

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Error: "Kafka Producer error"

```powershell
# Verificar que Kafka esté corriendo
docker-compose ps kafka
```

### Error: "Database connection failed"

```powershell
# Verificar variables de entorno de la DB
kubectl get configmap db-config -o yaml
kubectl get secret db-secret -o yaml
```

### Error: "Pod stuck in Pending"

```powershell
# Verificar recursos y nodos
kubectl describe pod <pod-name>
kubectl get nodes
```

### Error: "Sidecar no captura logs"

```powershell
# Verificar que el volumen esté montado
kubectl exec -it <pod-name> -c backend -- ls -la /app/logs
kubectl exec -it <pod-name> -c fluent-bit-sidecar -- ls -la /app/logs
```

## 📊 CHECKLIST FINAL

- [ ] ✅ Backend responde en puerto 3000
- [ ] ✅ Autenticación JWT funciona
- [ ] ✅ CRUD de productores funciona
- [ ] ✅ CRUD de pedidos funciona
- [ ] ✅ Kafka recibe mensajes
- [ ] ✅ WebSockets notifican cambios
- [ ] ✅ Logs se escriben a archivo
- [ ] ✅ Sidecar captura logs
- [ ] ✅ Base de datos persiste datos
- [ ] ✅ Proxy/Ingress rutea tráfico

---

🎉 **Si todo funciona, tienes un sistema distribuido completo con:**

- Microservicios (Backend + Frontend)
- Patrón Sidecar (Logging)
- Patrón Ambassador (Networking)
- Mensaje asíncrono (Kafka)
- Comunicación en tiempo real (WebSockets)
- Persistencia (PostgreSQL)
- Orquestación (Kubernetes)
