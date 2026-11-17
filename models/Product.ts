
import { Schema, model, models, Document, Model } from "mongoose";

interface IProduct extends Document {
	title: string,
	description: string,
	price: number
}

const ProductSchema = new Schema<IProduct>({
	title: {
		type: String,
		required: true
	},
	description: {
		type: String,
	},
	price: {
		type: Number,
		required: true
	}
})

const ProductModel: Model<IProduct> = models.Product || model<IProduct>("Product", ProductSchema);

export default ProductModel
// >>>>>>> 25b3b2d0a6ed8bb47e14fefc5db70f8daff1c6a2
