using System.Net;
using System.Text;
using System.Text.Json;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace Ideahub.Tests
{
    public class LlmServiceTests
    {
        private readonly Mock<IWebHostEnvironment> _mockEnv;
        private readonly Mock<ILogger<LlmService>> _mockLogger;
        private readonly Mock<HttpMessageHandler> _mockHttpMessageHandler;
        private readonly HttpClient _httpClient;

        public LlmServiceTests()
        {
            _mockEnv = new Mock<IWebHostEnvironment>();
            _mockLogger = new Mock<ILogger<LlmService>>();
            _mockHttpMessageHandler = new Mock<HttpMessageHandler>();
            _httpClient = new HttpClient(_mockHttpMessageHandler.Object);

            // Default setup for Environment (points to a fake path)
            _mockEnv.Setup(e => e.ContentRootPath).Returns(Directory.GetCurrentDirectory());
        }

        private LlmService CreateService(GeminiSettings settings)
        {
            var options = Options.Create(settings);
            return new LlmService(_httpClient, options, _mockEnv.Object, _mockLogger.Object);
        }

        [Fact]
        public async Task EvaluateIdeaAsync_ShouldReturnError_WhenApiKeyIsMissing()
        {
            // Arrange
            var settings = new GeminiSettings { ApiKey = "" };
            var service = CreateService(settings);

            // Act
            var (score, reasoning) = await service.EvaluateIdeaAsync("Title", "Align", "Prob", "Sol", "Use", "Cat");

            // Assert
            Assert.Equal(0, score);
            Assert.Contains("API Key not configured", reasoning);
        }

        [Fact]
        public async Task EvaluateIdeaAsync_ShouldReturnError_WhenPromptFileIsMissing()
        {
            // Arrange
            var settings = new GeminiSettings { ApiKey = "fake-key" };
            var service = CreateService(settings);
            // Ensure the path does NOT exist for this test
            _mockEnv.Setup(e => e.ContentRootPath).Returns(Path.Combine(Directory.GetCurrentDirectory(), "NonExistentFolder"));

            // Act
            var (score, reasoning) = await service.EvaluateIdeaAsync("Title", "Align", "Prob", "Sol", "Use", "Cat");

            // Assert
            Assert.Equal(0, score);
            Assert.Contains("System prompt file missing", reasoning);
        }

        [Fact]
        public async Task EvaluateIdeaAsync_ShouldReturnError_WhenApiReturnsErrorStatusCode()
        {
            // Arrange
            var settings = new GeminiSettings { ApiKey = "fake-key" };
            
            // 1. Fake prompt file
            var promptDir = Path.Combine(Directory.GetCurrentDirectory(), "Services", "LlmService", "Prompts");
            Directory.CreateDirectory(promptDir);
            File.WriteAllText(Path.Combine(promptDir, "SystemPrompt.txt"), "Fake Prompt {title}");

            // 2. Mock the HttpClient to return a 500 error
            _mockHttpMessageHandler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.InternalServerError,
                    Content = new StringContent("Server Error")
                });

            var service = CreateService(settings);

            // Act
            var (score, reasoning) = await service.EvaluateIdeaAsync("Title", "Align", "Prob", "Sol", "Use", "Cat");

            // Assert
            Assert.Equal(0, score);
            Assert.Contains("API returned InternalServerError", reasoning);
        }

        [Fact]
        public async Task EvaluateIdeaAsync_ShouldReturnScore_WhenApiSucceeds()
        {
            // Arrange
            var settings = new GeminiSettings { ApiKey = "fake-key" };
            
            // 1. Fake Prompt File again
            var promptDir = Path.Combine(Directory.GetCurrentDirectory(), "Services", "LlmService", "Prompts");
            Directory.CreateDirectory(promptDir);
            File.WriteAllText(Path.Combine(promptDir, "SystemPrompt.txt"), "Fake Prompt {title}");

            // 2. Mock a SUCCESSFUL Gemini response
            var geminiResponse = new {
                candidates = new[] {
                    new {
                        content = new {
                            parts = new[] {
                                new { text = "{\"score\": 8.5, \"reasoning\": \"Great idea!\"}" }
                            }
                        }
                    }
                }
            };
            var jsonResponse = JsonSerializer.Serialize(geminiResponse);

            _mockHttpMessageHandler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
                });

            var service = CreateService(settings);

            // Act
            var (score, reasoning) = await service.EvaluateIdeaAsync("Title", "Align", "Prob", "Sol", "Use", "Cat");

            // Assert
            Assert.Equal(8.5f, score);
            Assert.Equal("Great idea!", reasoning);
        }
    }
}
