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

        private static string SanitizeSubFolder(string subFolder)
        {
            if (string.IsNullOrWhiteSpace(subFolder))
                return string.Empty;

            // Remove any path treversal attempts and invalid characters
            var sanitized = Path.GetFileName(subFolder);
            return string.IsNullOrWhiteSpace(sanitized) ? string.Empty : sanitized;
        }

        public async Task<string> SaveFileAsync(IFormFile file, string subFolder = "")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty.");

            // Optional subfolder (e.g., projectId or commentId)
            var safeSubFolder = SanitizeSubFolder(subFolder);
            string folderPath = string.IsNullOrWhiteSpace(safeSubFolder) ? _rootPath : Path.Combine(_rootPath, safeSubFolder);
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            string uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            string fullPath = Path.Combine(folderPath, uniqueFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return a relative path for DB storage
            string relativePath = Path.Combine("media", safeSubFolder, uniqueFileName).Replace("\\", "/");
            return relativePath;
        }

        private string GetPhysicalPath(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
                return string.Empty;
                
            string cleanerPath = relativePath.Replace("media/", "").Replace("/", Path.DirectorySeparatorChar.ToString());
            string fullPath = Path.GetFullPath(Path.Combine(_rootPath, cleanerPath));

            if (!fullPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Attempted path traversal detected.");

            return fullPath;
        }

        public Task<bool> DeleteFileAsync(string relativePath)
        {
            try
            {
                string fullPath = GetPhysicalPath(relativePath);
                if (string.IsNullOrEmpty(fullPath))
                    return Task.FromResult(false);

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
            return GetPhysicalPath(relativePath);
        }
    }
}
