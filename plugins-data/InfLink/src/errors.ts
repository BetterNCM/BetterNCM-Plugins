export class NotImplementedError extends Error{
    constructor(message: string | undefined,options?: ErrorOptions | undefined){
        super(message,options)
    }
}