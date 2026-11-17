import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

// import mongoose from "mongoose";


// declare global {
//     var mongoose: any
// }

// const URI = process.env.MONGODB_URI;

// if(!URI) throw new Error("Can't find mongo URI")


// let cache = global.mongoose;

// if (!cache){
//     cache = global.mongoose = {conn:null, promise:null}
// }

// const dbConnect = async ()=>{
//     if(cache.conn){
//         return cache.conn;
//     }

//     if(!cache.promise){
//         cache.promise = mongoose.connect(URI, {bufferCommands:true}).then(mongoose=>mongoose)
//     }

//     try {
//         cache.conn = await cache.promise;
//     } 
    
//     catch (error) {
//         console.log("Error connecting to DB");
        
//     }

//     return cache.conn
// }

// export default dbConnect;

// // module.exports = dbConnect
