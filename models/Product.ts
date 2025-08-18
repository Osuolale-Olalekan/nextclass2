<<<<<<< HEAD
import mongoose from "mongoose";

export interface Product extends mongoose.Document {
    name: string;
    description: string;
    price: number;
    category: string;
    images: string;
    createdAt: Date;
    upDatedAt: Date;

}

const ProductSchema = new mongoose.Schema<Product>(
    {
        name: {
            type: String,
            required: true,
            maxLength: [100, "Product name cannot be more than 100 characters"],

        },

        description: {
            type: String,
            required: [true, "please provide a product description"],
            maxLength: [true, "Product description cannot be more than 100 characters"],

        },

        price: {
            type: Number,
            required: [true, "Please provide product price"],
            min: [true, "input a valid amount"],
        },

        category: {
            type: String,
            required: [true, "Please specify the product category."],
            maxlength: [50, "Category cannot be more than 50 characters"],
        },

        image: {
            type: String,
            required: [true, "Please specify the product category."],
            maxlength: [50, "Category cannot be more than 50 characters"],

        },

        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

export default mongoose.models.Product ||
    mongoose.model<Product>("Product", ProductSchema);
=======
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
>>>>>>> 25b3b2d0a6ed8bb47e14fefc5db70f8daff1c6a2
