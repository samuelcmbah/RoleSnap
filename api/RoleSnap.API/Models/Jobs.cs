namespace RoleSnap.Api.Models;

public class Job
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Company { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string Salary { get; set; } = string.Empty;

    public List<string> Stack { get; set; } = new();

    public string ContactInfo { get; set; } = string.Empty;

    public string SourceUrl { get; set; } = string.Empty;

    public string RawText { get; set; } = string.Empty;

    public string Status { get; set; } = "saved";

    public string Notes { get; set; } = string.Empty;

    public string? SnapshotUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}