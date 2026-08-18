export default class ControllerError extends Error {
    constructor(
        readonly statusCode: number,
        message: string,
    ) {
        super(message);
        this.statusCode = statusCode;
    }
}
