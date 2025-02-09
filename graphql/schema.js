const { buildSchema } = require("graphql");

module.exports = buildSchema(`

    type Product {
        _id: ID!
        title: String!
        description: String!
        imageUrl: String!
        price: Int!
        user: User
    }

    type CartItem {
        product: Product!
        quantity: Int!
    }

    type Order {
        _id: ID!
        user: User!
        products: [CartItem!]!
    }

    type Checkout {
        products: [CartItem!]!
        session_id: String!
    }

    type User {
        _id: ID!
        email: String!
        password: String
        resetToken: String,
        resetTokenExpiration: String,
        cart: [CartItem!]!
    }
    
    input UserInputData {
        email: String!
        password: String!
        confirmPassword: String!
    }

    input ProductInputData {
        _id: String
        title: String!
        description: String!
        price: Int!
        imageUrl: String
    }

    type AuthData {
        token: String!
        userId: String!
        email: String!
    }

    type ProductData {
        products: [Product!]!
        productCount: Int!
    }

    input ResetPasswordInputData {
        userId: String!
        password: String!
        token: String!
    }

    type RootQuery{
        login(email: String!, password: String!): AuthData!
        authStatus: String
        validatePassResetToken(token: String!): String!

        getCartItems: [CartItem!]!
        
        getCheckout: Checkout!

        getOrderDetails(orderId: String!): Order!
        getOrders: [Order!]!

        product(_id: String!): Product!
        products(role: String!, page: Int!): ProductData!
    }

    type RootMutation {
        createUser(userInput: UserInputData): String!
        sendPassResetMail(email: String!): String!

        addItemToCart(_id: String!): Boolean!
        deleteItemFromCart(_id: String!): Boolean!

        placeOrder(session_id: String!): String!
        
        resetPassword(resetPasswordInput: ResetPasswordInputData!): String!
        createProduct(productInput: ProductInputData): Product!
        updateProduct(productInput: ProductInputData): Product!
        deleteProduct(_id: String!): Boolean!
    }
    
    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
