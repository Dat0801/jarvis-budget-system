<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\Income;
use App\Models\Jar;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TransactionCategorySeeder extends Seeder
{
    public function run(): void
    {
        $users = User::whereIn('email', ['admin@jarvis.local', 'user@jarvis.local'])->get();

        if ($users->isEmpty()) {
            return;
        }

        $expenseCatalog = $this->expenseCatalog();
        $incomeCatalog = $this->incomeCatalog();
        $debtLoanCatalog = $this->debtLoanCatalog();

        foreach ($users as $user) {
            $expenseJar = $this->firstOrCreateJar(
                userId: $user->id,
                name: 'Expense Master Budget',
                category: 'Expense'
            );

            $incomeJar = $this->firstOrCreateJar(
                userId: $user->id,
                name: 'Income Master Budget',
                category: 'Income'
            );

            $debtLoanJar = $this->firstOrCreateJar(
                userId: $user->id,
                name: 'Debt & Loan Master Budget',
                category: 'Debt/Loan'
            );

            $this->seedExpenseCategories($user->id, $expenseJar->id, $expenseCatalog);
            $this->seedIncomeCategories($user->id, $incomeJar->id, $incomeCatalog);
            $this->seedDebtLoanCategories($user->id, $debtLoanJar->id, $debtLoanCatalog);
        }
    }

    /**
     * @param  array<int, array{category:string, sub_categories:array<int, string>}>  $catalog
     */
    private function seedExpenseCategories(int $userId, int $jarId, array $catalog): void
    {
        foreach ($catalog as $categoryIndex => $item) {
            foreach ($item['sub_categories'] as $subIndex => $subCategory) {
                $spentAt = Carbon::now()->subDays(($categoryIndex * 7) + $subIndex + 1)->toDateString();

                Expense::firstOrCreate([
                    'user_id' => $userId,
                    'jar_id' => $jarId,
                    'category' => $item['category'],
                    'note' => 'Sub-category: '.$subCategory,
                    'spent_at' => $spentAt,
                ], [
                    'amount' => (90000 + ($categoryIndex * 15000) + ($subIndex * 2500)),
                ]);
            }
        }
    }

    /**
     * @param  array<int, array{category:string, sub_categories:array<int, string>}>  $catalog
     */
    private function seedIncomeCategories(int $userId, int $jarId, array $catalog): void
    {
        foreach ($catalog as $categoryIndex => $item) {
            foreach ($item['sub_categories'] as $subIndex => $subCategory) {
                $receivedAt = Carbon::now()->subDays(($categoryIndex * 6) + $subIndex + 1)->toDateString();

                Income::firstOrCreate([
                    'user_id' => $userId,
                    'jar_id' => $jarId,
                    'source' => $item['category'].' > '.$subCategory,
                    'received_at' => $receivedAt,
                ], [
                    'amount' => (450000 + ($categoryIndex * 85000) + ($subIndex * 12000)),
                ]);
            }
        }
    }

    /**
     * @param  array<int, array{category:string, sub_categories:array<int, string>}>  $catalog
     */
    private function seedDebtLoanCategories(int $userId, int $jarId, array $catalog): void
    {
        foreach ($catalog as $categoryIndex => $item) {
            foreach ($item['sub_categories'] as $subIndex => $subCategory) {
                $spentAt = Carbon::now()->subDays(($categoryIndex * 5) + $subIndex + 1)->toDateString();
                $receivedAt = Carbon::now()->subDays(($categoryIndex * 5) + $subIndex + 2)->toDateString();

                Expense::firstOrCreate([
                    'user_id' => $userId,
                    'jar_id' => $jarId,
                    'category' => $item['category'],
                    'note' => 'Payment - Sub-category: '.$subCategory,
                    'spent_at' => $spentAt,
                ], [
                    'amount' => (220000 + ($categoryIndex * 30000) + ($subIndex * 10000)),
                ]);

                Income::firstOrCreate([
                    'user_id' => $userId,
                    'jar_id' => $jarId,
                    'source' => $item['category'].' > Borrowed via '.$subCategory,
                    'received_at' => $receivedAt,
                ], [
                    'amount' => (300000 + ($categoryIndex * 45000) + ($subIndex * 15000)),
                ]);
            }
        }
    }

    private function firstOrCreateJar(int $userId, string $name, string $category): Jar
    {
        return Jar::firstOrCreate(
            [
                'user_id' => $userId,
                'name' => $name,
            ],
            [
                'category' => $category,
                'description' => 'Seeded master data for '.$category,
                'color' => '#667eea',
                'balance' => 0,
                'budget_date' => Carbon::now()->startOfMonth()->toDateString(),
                'repeat_this_budget' => true,
            ]
        );
    }

    /**
     * @return array<int, array{category:string, sub_categories:array<int, string>}>
     */
    private function expenseCatalog(): array
    {
        return [
            [
                'category' => 'Food & Dining',
                'sub_categories' => ['Groceries', 'Restaurant', 'Cafe', 'Food Delivery', 'Snacks'],
            ],
            [
                'category' => 'Transport',
                'sub_categories' => ['Fuel', 'Ride Hailing', 'Public Transport', 'Parking', 'Vehicle Maintenance'],
            ],
            [
                'category' => 'Bills & Utilities',
                'sub_categories' => ['Electricity Bill', 'Gas Bill', 'Internet Bill', 'Water Bill', 'Phone Bill'],
            ],
            [
                'category' => 'Housing',
                'sub_categories' => ['Rent', 'Home Repair', 'Furniture', 'Cleaning Service', 'Condo Fee'],
            ],
            [
                'category' => 'Health & Wellness',
                'sub_categories' => ['Pharmacy', 'Medical Checkup', 'Health Insurance', 'Gym', 'Supplements'],
            ],
            [
                'category' => 'Shopping',
                'sub_categories' => ['Clothing', 'Shoes', 'Accessories', 'Electronics', 'Household Items'],
            ],
            [
                'category' => 'Education',
                'sub_categories' => ['Tuition', 'Books', 'Online Courses', 'Certification', 'Workshops'],
            ],
            [
                'category' => 'Entertainment',
                'sub_categories' => ['Movies', 'Gaming', 'Streaming Services', 'Concerts', 'Hobbies'],
            ],
            [
                'category' => 'Family & Kids',
                'sub_categories' => ['Childcare', 'School Fees', 'Toys', 'Family Activities', 'Allowance'],
            ],
            [
                'category' => 'Travel',
                'sub_categories' => ['Flights', 'Hotel', 'Local Transport', 'Travel Insurance', 'Souvenirs'],
            ],
        ];
    }

    /**
     * @return array<int, array{category:string, sub_categories:array<int, string>}>
     */
    private function incomeCatalog(): array
    {
        return [
            [
                'category' => 'Salary',
                'sub_categories' => ['Base Salary', 'Overtime Pay', 'Performance Bonus', '13th Month Salary'],
            ],
            [
                'category' => 'Freelance & Side Hustle',
                'sub_categories' => ['Design Project', 'Development Project', 'Consulting', 'Tutoring'],
            ],
            [
                'category' => 'Business Income',
                'sub_categories' => ['Product Sales', 'Service Revenue', 'Affiliate Commission', 'Marketplace Sales'],
            ],
            [
                'category' => 'Investment Returns',
                'sub_categories' => ['Dividends', 'Stock Profit', 'Crypto Profit', 'Bond Interest'],
            ],
            [
                'category' => 'Rental Income',
                'sub_categories' => ['Apartment Rent', 'Parking Rent', 'Room Rent'],
            ],
            [
                'category' => 'Gifts & Support',
                'sub_categories' => ['Family Support', 'Cash Gift', 'Special Event Gift'],
            ],
            [
                'category' => 'Refunds & Reimbursements',
                'sub_categories' => ['Tax Refund', 'Travel Reimbursement', 'Insurance Claim', 'Product Refund'],
            ],
        ];
    }

    /**
     * @return array<int, array{category:string, sub_categories:array<int, string>}>
     */
    private function debtLoanCatalog(): array
    {
        return [
            [
                'category' => 'Debt/Loan',
                'sub_categories' => ['Mortgage Payment', 'Personal Loan Payment', 'Credit Card Payment', 'Student Loan Payment'],
            ],
            [
                'category' => 'Debt/Loan',
                'sub_categories' => ['Borrowed From Family', 'Borrowed From Friend', 'Bank Personal Loan', 'Payday Loan'],
            ],
            [
                'category' => 'Debt/Loan',
                'sub_categories' => ['Car Loan Installment', 'Home Appliance Installment', 'Phone Installment'],
            ],
        ];
    }
}
