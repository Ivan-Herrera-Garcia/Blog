// deno-lint-ignore-file
import {
  Application,
  Context,
  helpers,
  Router,
} from "https://deno.land/x/oak@v12.4.0/mod.ts";
// import { Bson } from "https://deno.land/x/mongo@v0.31.1/mod.ts"; // Importa Bson para usar ObjectId
import { hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
const client = new MongoClient();
await client.connect({
  db: "HextechIt",  // Nombre de la base de datos
  tls: true,
  servers: [
        {
        host: "hextechit-shard-00-01.nxlay.mongodb.net",
        port: 27017,
        },
    ],
  credential: {
    username: "user",  // Usuario de MongoDB
    password: "contrasena123",  // Reemplaza <db_password> con tu contraseña
    db: "admin",
    mechanism: "SCRAM-SHA-1",
  },
});

const db = client.database("sesion");
const userCollection = db.collection("user");
const { getQuery } = helpers;

const app = new Application();
const router = new Router();

// Endpoint POST para crear un usuario
router.post("/createUsers", async (context: Context) => {
  try {
    const body = context.request.body();
    const data = await body.value;
    var { name, email, pwd } = data;

    // Hashear la contraseña antes de guardarla
    const hashedPwd = hashSync(pwd);
    // Insertar en la colección
    const { $oid } = await userCollection.insertOne({ name, email, pwd: hashedPwd });

    context.response.body = { message: "Registro guardado con éxito", id: $oid };
  } catch (error: any) {
    console.error("Error:", error);
    context.response.status = 500;
    context.response.body = { message: "Error, consultar con el administrador", error: error.message };
  }
});

router.post("/login", async (context: Context) => {
  try {
    const body = context.request.body();
    const data = await body.value;
    var { email, pwd } = data;

    // Buscar usuario en la base de datos
    const user = await userCollection.findOne({ email });

    if (!user) {
      context.response.status = 401;
      context.response.body = { message: "Usuario no encontrado" };
      return;
    }

    // Comparar la contraseña ingresada con la almacenada en la BD
    const isValidPassword = compareSync(pwd, user.pwd);

    if (!isValidPassword) {
      context.response.status = 401;
      context.response.body = { message: "Contraseña incorrecta" };
      return;
    }

    context.response.body = { message: "Login exitoso", user };
  } catch (error: any) {
    console.error("Error:", error);
    context.response.status = 500;
    context.response.body = { message: "Error, consultar con el administrador", error: error.message };
  }
});

// Endpoint para verificar que el servidor está en funcionamiento
router.get("/", (context: Context) => {
  context.response.body = "Bienvenido al API de HextechIt";
});

// Usar las rutas y métodos permitidos
app.use(router.routes());
app.use(router.allowedMethods());

// Iniciar el servidor en el puerto 8000
console.log("Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });