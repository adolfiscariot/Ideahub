//This is a standardized response to be used throughout the entire app

namespace api.Constants;

public class ApiResponse
{
    public bool Status {get; set;}
    public string Message {get; set;} = string.Empty;
    public List<string>? Errors {get; set;}

    public static ApiResponse Ok(string message) => new() {
        Status = true, 
        Message = message
    };
    public static ApiResponse Fail(string message, List<string> errors) => new() 
    {
        Status = false, 
        Message = message, 
        Errors = errors
    };
}