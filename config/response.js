export const successResponse = ({isSuccess, message} ,result)=>{

    return{

        isSuccess: isSuccess, 
        code: 200,
        message: message, 
        result : result
    }

}

export const errResponse = ({isSuccess, code,  message} ,result)=>{

    return{

        isSuccess: isSuccess, 
        code: code,
        message: message, 
        result : result
    }

}


