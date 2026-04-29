using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using api.Models;
using Microsoft.Extensions.Options;

namespace api.Services;

public class GeminiSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string ModelName { get; set; } = "gemini-2.5-flash";
}

public class LlmService : ILlmService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiSettings _settings;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<LlmService> _logger;

    public LlmService(HttpClient httpClient, IOptions<GeminiSettings> settings, IWebHostEnvironment env, ILogger<LlmService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _env = env;
        _logger = logger;
    }

    public async Task<(float Score, string Reasoning)> EvaluateIdeaAsync(string title, string alignment, string problem, string solution, string useCase, string innovationCategory, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(_settings.ApiKey))
            {
                _logger.LogError("LlmService: Gemini API Key is MISSING. Please set it in user-secrets.");
                return (0, "AI Evaluation failed: API Key not configured.");
            }

            // Read the system prompt from the file
            var promptPath = Path.Combine(_env.ContentRootPath, "Services", "LlmService", "Prompts", "SystemPrompt.txt");
            if (!File.Exists(promptPath))
            {
                _logger.LogError("LlmService: SystemPrompt.txt NOT FOUND at {Path}", promptPath);
                return (0, "AI Evaluation failed: System prompt file missing.");
            }

            var systemPrompt = await File.ReadAllTextAsync(promptPath);

            // Build the final prompt by replacing placeholders
            var finalPrompt = systemPrompt
                .Replace("{title}", title)
                .Replace("{category}", innovationCategory)
                .Replace("{alignment}", alignment)
                .Replace("{problem}", problem)
                .Replace("{solution}", solution)
                .Replace("{useCase}", useCase);

            // Prepare the API request
            var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{_settings.ModelName}:generateContent";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = finalPrompt }
                        }
                    }
                },
                generation_config = new
                {
                    response_mime_type = "application/json"
                }
            };

            // Call the Gemini API
            _logger.LogInformation("LlmService: Sending request to Gemini API...");

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
            request.Content = JsonContent.Create(requestBody);
            request.Headers.Add("x-goog-api-key", _settings.ApiKey);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(30));
            var response = await _httpClient.SendAsync(request, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("LlmService: Gemini API request failed. Status: {StatusCode}, Error: {Error}", response.StatusCode, errorContent);
                return (0, $"AI Evaluation failed: API returned {response.StatusCode}.");
            }

            var rawContent = await response.Content.ReadAsStringAsync();

            var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(rawContent);
            var jsonResult = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

            if (string.IsNullOrWhiteSpace(jsonResult))
            {
                _logger.LogWarning("LlmService: Received empty or malformed response from Gemini. Response Body: {RawContent}", rawContent);
                return (0, "AI Evaluation returned an empty result.");
            }

            // Parse the JSON result from the LLM
            var evaluation = JsonSerializer.Deserialize<IdeaEvaluationResult>(jsonResult, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            //_logger.LogInformation("LlmService: Evaluation successful. Score: {Score}, Reasoning: {Reasoning}", evaluation?.Score, evaluation?.Reasoning);
            _logger.LogInformation("AI Evaluation successful");

            return (evaluation?.Score ?? 0, evaluation?.Reasoning ?? "No reasoning provided.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LlmService: An unexpected error occurred during evaluation.");
            return (0, "An unexpected error occurred during AI evaluation.");
        }
    }

    private class IdeaEvaluationResult
    {
        public float Score { get; set; }
        public string Reasoning { get; set; } = string.Empty;
    }

    private class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate>? Candidates { get; set; }
    }

    private class Candidate
    {
        [JsonPropertyName("content")]
        public Content? Content { get; set; }
    }

    private class Content
    {
        [JsonPropertyName("parts")]
        public List<Part>? Parts { get; set; }
    }

    private class Part
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}
