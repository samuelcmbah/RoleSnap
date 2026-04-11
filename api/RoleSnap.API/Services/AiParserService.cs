using RoleSnap.API.DTOs;
using System.Text;
using System.Text.Json;

public class AiParserService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public AiParserService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["AiModel:ApiKey"] ?? throw new InvalidOperationException("Ai model API key is not configured");
    }
    public async Task<JobDetailsResponseDTO> ExtractJobDetailsAsync(string rawText)
    {
        var prompt = $"""
            You are an intelligent job data extraction engine.

            Your task is to extract structured job information from ANY job description text, regardless of country, format, or source (e.g. LinkedIn, WhatsApp, email, PDFs, job boards).

            Extract the following fields:

            - title: the job title
            - company: the company or organization name
            - location: include city, country, or indicate Remote/Hybrid/On-site if specified
            - salary: include currency and time period if present (e.g. ₦500,000/month, $3,000/year, €60k annually)
            - stack: a JSON array of technologies, tools, or skills mentioned (e.g. ["React", "Node.js", "PostgreSQL"])
            - contact_info: ANY email address, phone number, WhatsApp number, or application link found anywhere in the text

            Rules:

            - Read the ENTIRE text carefully before extracting
            - The text may be messy, informal, or unstructured (e.g. copied chat messages or forwarded posts)
            - Support ALL international formats for salary, phone numbers, and locations
            - For contact_info:
              - Extract anything that looks like:
                - emails (contains @)
                - phone numbers (any digit sequence, including international formats like +234, +1, +44, etc.)
                - URLs (job application links)
              - If multiple exist, concatenate them with commas

            - Normalize output:
              - location should be concise (e.g. "Remote", "London, UK", "Lagos Hybrid")
              - salary should remain as text exactly as written (do NOT calculate or convert)

            - If a field is missing:
              - return "N/A" for string fields
              - return [] for stack

            - Return ONLY a valid JSON object with EXACTLY these keys:
              title, company, location, salary, stack, contact_info

            - Do NOT include:
              - explanations
              - markdown
              - code blocks

            Text:
            {rawText}
            """;

        var requestBody = new
        {
            model = "llama-3.3-70b-versatile",
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = "You are a precise job data extractor. You always return valid JSON only. No markdown, no explanation, no code blocks. Just the raw JSON object."
                },
                new
                {
                    role = "user",
                    content = prompt
                }
            },
            temperature = 0.1
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8,"application/json");

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

        var response = await _httpClient.PostAsync(
            "https://api.groq.com/openai/v1/chat/completions", content);


        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"AI model API returned {(int)response.StatusCode}: {errorBody}");
        }
        var responseBody = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(responseBody);
        var generatedText = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;

        // Clean up in case model wraps response in markdown code blocks
        var cleanedText = generatedText
            .Replace("```json", "")
            .Replace("```", "")
            .Trim();

        var jobDetails = JsonSerializer.Deserialize<JobDetailsResponseDTO>(cleanedText, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });


        return jobDetails ?? new JobDetailsResponseDTO();

    }
}