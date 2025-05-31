//This is a standardized response to be used throughout the entire app

namespace api.Helpers;

public class ApiResponse
{
    public bool Status {get; set;}
    public string Message {get; set;} = string.Empty;
    public object? Data { get; set; }
    public List<string>? Errors {get; set;}

    public static ApiResponse Ok(string message) => new() {
        Status = true, 
        Message = message
    };

    //overload the Ok method incase we need to return some data
    public static ApiResponse Ok(string message, object data) => new() {
        Status = true, 
        Message = message,
        Data = data
    };

    public static ApiResponse Fail(string message) => new() 
    {
        Status = false, 
        Message = message, 
    };

    //overload the Fail method incase we need to return some errors
    public static ApiResponse Fail(string message, List<string>? errors) => new() 
    {
        Status = false, 
        Message = message, 
        Errors = errors
    };
}