using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Options;
using api.Models;

namespace api.Helpers;

public class ResendEmailSender : Microsoft.AspNetCore.Identity.UI.Services.IEmailSender
{
    private readonly ResendSettings _settings;
    private readonly ILogger<ResendEmailSender> _logger;
    private readonly HttpClient _httpClient;
    private const string ResendApiEndpoint = "https://api.resend.com/emails";

    public ResendEmailSender(
        IOptions<ResendSettings> settings,
        ILogger<ResendEmailSender> logger,
        HttpClient httpClient
    )
    {
        _settings = settings.Value;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string message)
    {
        _logger.LogInformation("Resend API key length: {Length}", _settings.ApiKey?.Length);
        _logger.LogInformation("Resend FromEmail: {FromEmail}", _settings.FromEmail);
        
        try
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                _logger.LogError("Resend API Key is not configured");
                return;
            }

            var requestBody = new
            {
                from = $"{_settings.FromName} <{_settings.FromEmail}>",
                to = toEmail,
                subject = subject,
                html = message
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            // Set authorization header
            _httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            var response = await _httpClient.PostAsync(ResendApiEndpoint, content);

            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning(
                    "Failed to send email via Resend: Status={StatusCode}, Response={Response}",
                    response.StatusCode,
                    responseBody
                );
            }
            else
            {
                _logger.LogInformation("Email sent successfully to {ToEmail} via Resend", toEmail);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email via Resend to {ToEmail}", toEmail);
        }
    }
}
