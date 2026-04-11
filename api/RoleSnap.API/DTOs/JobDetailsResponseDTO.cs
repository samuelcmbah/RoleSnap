using System.Text.Json.Serialization;

namespace RoleSnap.API.DTOs
{
    public class JobDetailsResponseDTO
    {
        public string Title { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Salary { get; set; } = string.Empty;
        public List<string> Stack { get; set; } = new();

        [JsonPropertyName("contact_info")]
        public string ContactInfo { get; set; } = string.Empty;
    }
}
