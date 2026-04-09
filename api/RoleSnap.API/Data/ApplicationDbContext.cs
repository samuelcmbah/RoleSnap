using Microsoft.EntityFrameworkCore;
using RoleSnap.Api.Models;

namespace RoleSnap.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Job> Jobs => Set<Job>();
}