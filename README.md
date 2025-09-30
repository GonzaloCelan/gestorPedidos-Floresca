
# Sistema de pedidos- Floresca

Administrador simple para un emprendimiento de flores artesanales. Permite tomar pedidos, gestionar materiales y visualizar el historial de ganancias.


## Tech Stack

**Client:** HTML, CSS, JavaScript (PWA con Service Worker)

**Server:** Java 23, Spring Boot 3.x (Web, Validation, JPA/Hibernate), Maven, Lombok

**Database:** MySQL
## API Reference

#### Crear un pedido nuevo

```http
  POST /api/v1/pedidos
```
| Parameter       | Type     | Description                      |
| :-------------- | :------- | :------------------------------- |
| `Authorization` | `string` | **Required**. `Bearer <API_KEY>` |

| Parameter      | Type     | Description                            |
| :------------- | :------- | :------------------------------------- |
| `cliente`      | `string` | **Required**. Nombre del cliente       |
| `producto`     | `string` | **Required**. Descripción del producto |
| `cantidad`     | `number` | **Required**. Cantidad (≥ 1)           |
| `total`        | `number` | **Required**. Importe (≥ 0)            |
| `fechaEntrega` | `string` | **Required**. Fecha `YYYY-MM-DD`       |



#### Obtener pedidos activos

```http
  GET /api/v1/pedidos
```

| Parameter       | Type     | Description                      |
| :-------------- | :------- | :------------------------------- |
| `Authorization` | `string` | **Required**. `Bearer <API_KEY>` |

| Parameter | Type     | Description                                            |
| :-------- | :------- | :----------------------------------------------------- |
| `estado`  | `string` | **Optional**. `PENDIENTE` | `EN_PROCESO` s
| `page`    | `number` | **Optional**. Página (default `0`)                     |
| `size`    | `number` | **Optional**. Tamaño (default `20`)                    |
| `sort`    | `string` | **Optional**. Ej.: `fechaCreacion,desc`                |



#### Actualizar pedido por id
```http
  PUT /api/v1/pedidos/{id}
```

| Parameter | Type     | Description                 |
| :-------- | :------- | :-------------------------- |
| `id`      | `string` | **Required**. Id del pedido |

| Parameter | Type     | Description                                            |
| :-------- | :------- | :----------------------------------------------------- |
| `estado`  | `string` | **Optional**. `PENDIENTE` | `EN_PROCESO` s
| `page`    | `number` | **Optional**. Página (default `0`)                     |
| `size`    | `number` | **Optional**. Tamaño (default `20`)                    |
| `sort`    | `string` | **Optional**. Ej.: `fechaCreacion,desc`                |


#### Actualizar estado del pedido
```http
  PUT /api/v1/pedidos/{id}/{estado}
```

| Parameter | Type     | Description                                            |
| :-------- | :------- | :----------------------------------------------------- |
| `id`      | `string` | **Required**. Id del pedido                            |
| `estado`  | `string` | **Required**. `PENDIENTE` | `EN_PROCESO` | `ENTREGADO` |


#### Eliminar pedido por id
```http
  DELETE /api/v1/pedidos/{id}
```

| Parameter | Type     | Description                 |
| :-------- | :------- | :-------------------------- |
| `id`      | `string` | **Required**. Id del pedido |




