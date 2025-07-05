import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb+srv://studiofusionweb:yA393xeTzBxH35Ny@tenant.nqhqp.mongodb.net/loanbackend?retryWrites=true&w=majority',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        );

        console.log(`📁 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        process.exit(1);
    }
};

export default connectDB;