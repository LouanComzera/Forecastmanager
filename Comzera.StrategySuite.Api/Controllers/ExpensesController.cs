using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Comzera.StrategySuite.Api.Data;
using Comzera.StrategySuite.Api.Models;
using System.Globalization;
using System.Text;

namespace Comzera.StrategySuite.Api.Controllers;

public record SummaryResponse(decimal TotalExpenses, int ExpenseCount, decimal PendingTotal, int PendingCount);

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ExpensesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Expense>>> GetExpenses(string? month, int? companyId)
    {
        var query = _context.Expenses.Include(e => e.Company).AsQueryable();

        if (!string.IsNullOrEmpty(month))
        {
            // month format: YYYY-MM
            if (DateTime.TryParse(month + "-01", out var startDate))
            {
                var endDate = startDate.AddMonths(1);
                query = query.Where(e => e.Date >= startDate && e.Date < endDate);
            }
        }

        if (companyId.HasValue)
        {
            query = query.Where(e => e.CompanyId == companyId.Value);
        }

        return await query.OrderBy(e => e.Date).ToListAsync();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<SummaryResponse>> GetSummary(string month, int? companyId)
    {
        var query = _context.Expenses.AsQueryable();

        if (!string.IsNullOrEmpty(month))
        {
            if (DateTime.TryParse(month + "-01", out var startDate))
            {
                var endDate = startDate.AddMonths(1);
                query = query.Where(e => e.Date >= startDate && e.Date < endDate);
            }
        }

        if (companyId.HasValue)
        {
            query = query.Where(e => e.CompanyId == companyId.Value);
        }

        var expenses = await query.ToListAsync();
        var total = expenses.Sum(e => e.Amount);
        var pendingItems = expenses.Where(e => !e.IsPaid).ToList();
        var pendingTotal = pendingItems.Sum(e => e.Amount);

        return new SummaryResponse(total, expenses.Count, pendingTotal, pendingItems.Count);
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> PostExpense(Expense expense)
    {
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetExpenses), new { id = expense.Id }, expense);
    }

    [HttpPut("{id}/toggle-paid")]
    public async Task<IActionResult> TogglePaid(int id)
    {
        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null) return NotFound();

        expense.IsPaid = !expense.IsPaid;
        await _context.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpPost("import-csv")]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file uploaded");

        var expenses = new List<Expense>();
        var companies = await _context.Companies.ToDictionaryAsync(c => c.Name.ToLower(), c => c);

        using (var reader = new StreamReader(file.OpenReadStream()))
        {
            var headerLine = await reader.ReadLineAsync(); // Skip header
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = line.Split(',');
                if (parts.Length < 4) continue;

                var date = DateTime.TryParse(parts[0], out var d) ? d : DateTime.Now;
                var companyName = parts[1].Trim();
                var description = parts[2];
                var amount = decimal.TryParse(parts[3], out var a) ? a : 0;
                
                // Optional: IsPaid and IsFixed can follow if needed, but primary 4 are prioritized
                var isPaid = parts.Length > 4 && parts[4].Trim().ToLower() == "true";
                var isFixed = parts.Length > 5 && parts[5].Trim().ToLower() == "true";

                if (!companies.TryGetValue(companyName.ToLower(), out var company))
                {
                    company = new Company { Name = companyName };
                    _context.Companies.Add(company);
                    await _context.SaveChangesAsync();
                    companies[companyName.ToLower()] = company;
                }

                expenses.Add(new Expense
                {
                    Description = description,
                    Amount = amount,
                    Date = date,
                    CompanyId = company.Id,
                    IsPaid = isPaid,
                    IsFixed = isFixed
                });
            }
        }

        _context.Expenses.AddRange(expenses);
        await _context.SaveChangesAsync();

        return Ok(new { count = expenses.Count });
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<int>> PostBulk([FromBody] IEnumerable<Expense> expenses)
    {
        if (expenses == null || !expenses.Any()) return BadRequest("No data provided");

        _context.Expenses.AddRange(expenses);
        var count = await _context.SaveChangesAsync();
        return Ok(count);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null) return NotFound();

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
