using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;

namespace api.Services
{
    public class LocalMediaFileService : IMediaFileService
    {
        private readonly string _rootPath;

        public LocalMediaFileService()
        {
            // Base storage path outside wwwroot (more secure)
            _rootPath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "media");

            if (!Directory.Exists(_rootPath))
                Directory.CreateDirectory(_rootPath);
        }

        public async Task<string> SaveFileAsync(IFormFile file, string subFolder = "")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty.");

            // Optional subfolder (e.g., projectId or commentId)
            string folderPath = string.IsNullOrWhiteSpace(subFolder) ? _rootPath : Path.Combine(_rootPath, subFolder);
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            string uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            string fullPath = Path.Combine(folderPath, uniqueFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return a **relative path** for DB storage
            string relativePath = Path.Combine("media", subFolder, uniqueFileName).Replace("\\", "/");
            return relativePath;
        }

        public Task<bool> DeleteFileAsync(string relativePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(relativePath))
                    return Task.FromResult(false);

                string fullPath = Path.Combine(_rootPath, relativePath.Replace("media/", ""));
                if (File.Exists(fullPath))
                    File.Delete(fullPath);

                return Task.FromResult(true);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public string GetFilePath(string relativePath)
        {
            return Path.Combine(_rootPath, relativePath.Replace("media/", ""));
        }
    }
}
