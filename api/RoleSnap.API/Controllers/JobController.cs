using Microsoft.AspNetCore.Mvc;
using RoleSnap.Api.Data;
using RoleSnap.Api.DTOs;
using RoleSnap.Api.Models;

namespace RoleSnap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly AiParserService _aiParserService;
    private readonly ApplicationDbContext _db;

    public JobsController(AiParserService aiParserService, ApplicationDbContext db)
    {
        _aiParserService = aiParserService;
        _db = db;
    }

    [HttpPost("parse")]
    public async Task<ActionResult<Job>> ParseAndSave([FromBody] RawTextRequestDTO request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest("Text cannot be empty.");
        }

        var jobDetails = await _aiParserService.ExtractJobDetailsAsync(request.Text);

        // Check if Gemini found anything meaningful
        if (jobDetails.Title == "N/A" && jobDetails.Company == "N/A")
        {
            return BadRequest("The selected text does not appear to be a job posting.");
        }

        var job = new Job
        {
            Id = Guid.NewGuid(),
            Title = jobDetails.Title,
            Company = jobDetails.Company,
            Location = jobDetails.Location,
            Salary = jobDetails.Salary,
            Stack = jobDetails.Stack,
            ContactInfo = jobDetails.ContactInfo,
            SourceUrl = request.SourceUrl,
            RawText = request.Text,
            Status = "saved",
            Notes = string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Jobs.Add(job);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = job.Id }, job);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Job>> GetById(Guid id)
    {
        var job = await _db.Jobs.FindAsync(id);

        if (job is null)
        {
            return NotFound();
        }

        return Ok(job);
    }
}