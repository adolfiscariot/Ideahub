using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace api.Services
{

    public interface IMediaFileService
    {
        Task<string> SaveFileAsync(IFormFile file, string subFolder = "");
        Task<bool> DeleteFileAsync(string relativePath);
        string GetFilePath(string relativePath);
    }
}
