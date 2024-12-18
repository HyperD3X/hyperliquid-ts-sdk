export class ClientError extends Error {
    statusCode: number;
    errorCode: string;
    errorMessage: string;
    header: any;
    errorData: any;

    constructor(statusCode: number, errorCode: string, errorMessage: string, header: any, errorData: any = null) {
        super();
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.header = header;
        this.errorData = errorData;
    }
}

export class ServerError extends Error {
    statusCode: number;
    message: string;

    constructor(statusCode: number, message: string) {
        super();
        this.statusCode = statusCode;
        this.message = message;
    }
}
