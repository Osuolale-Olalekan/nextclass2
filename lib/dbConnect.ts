import mongoose from "mongoose";


declare global {
    var mongoose: any
}

const URI = process.env.MONGODB_URI;

if(!URI) throw new Error("Can't find mongo URI")


let cache = global.mongoose;

if (!cache){
    cache = global.mongoose = {conn:null, promise:null}
}

const dbConnect = async ()=>{
    if(cache.conn){
        return cache.conn;
    }

    if(!cache.promise){
        cache.promise = mongoose.connect(URI, {bufferCommands:true}).then(mongoose=>mongoose)
    }

    try {
        cache.conn = await cache.promise;
    } 
    
    catch (error) {
        console.log("Error connecting to DB");
        
    }

    return cache.conn
}

export default dbConnect;

// module.exports = dbConnect
