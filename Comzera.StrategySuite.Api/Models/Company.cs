using System.ComponentModel.DataAnnotations;

namespace Comzera.StrategySuite.Api.Models;

public class Company
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Relationship: One company has many expenses
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
