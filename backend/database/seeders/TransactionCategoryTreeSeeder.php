<?php

namespace Database\Seeders;

use App\Models\TransactionCategory;
use Illuminate\Database\Seeder;

class TransactionCategoryTreeSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->treeData() as $type => $categories) {
            foreach ($categories as $parentIndex => $category) {
                $parent = TransactionCategory::updateOrCreate(
                    [
                        'type' => $type,
                        'parent_id' => null,
                        'name' => $category['name'],
                    ],
                    [
                        'icon' => $category['icon'],
                        'sort_order' => $parentIndex,
                        'is_active' => true,
                    ]
                );

                foreach ($category['children'] as $childIndex => $child) {
                    TransactionCategory::updateOrCreate(
                        [
                            'type' => $type,
                            'parent_id' => $parent->id,
                            'name' => $child['name'],
                        ],
                        [
                            'icon' => $child['icon'],
                            'sort_order' => $childIndex,
                            'is_active' => true,
                        ]
                    );
                }
            }
        }
    }

    /**
     * @return array<string, array<int, array{name:string, icon:string, children:array<int, array{name:string, icon:string}>}>>
     */
    private function treeData(): array
    {
        return [
            'expense' => [
                [
                    'name' => 'Food & Dining',
                    'icon' => 'restaurant-outline',
                    'children' => [
                        ['name' => 'Groceries', 'icon' => 'basket-outline'],
                        ['name' => 'Restaurant', 'icon' => 'cafe-outline'],
                        ['name' => 'Food Delivery', 'icon' => 'bicycle-outline'],
                    ],
                ],
                [
                    'name' => 'Transport',
                    'icon' => 'car-outline',
                    'children' => [
                        ['name' => 'Fuel', 'icon' => 'flame-outline'],
                        ['name' => 'Ride Hailing', 'icon' => 'car-sport-outline'],
                        ['name' => 'Public Transport', 'icon' => 'train-outline'],
                    ],
                ],
                [
                    'name' => 'Bills & Utilities',
                    'icon' => 'flash-outline',
                    'children' => [
                        ['name' => 'Electricity Bill', 'icon' => 'flash-outline'],
                        ['name' => 'Gas Bill', 'icon' => 'flame-outline'],
                        ['name' => 'Internet Bill', 'icon' => 'wifi-outline'],
                        ['name' => 'Water Bill', 'icon' => 'water-outline'],
                    ],
                ],
                [
                    'name' => 'Health & Wellness',
                    'icon' => 'medkit-outline',
                    'children' => [
                        ['name' => 'Medical Checkup', 'icon' => 'heart-outline'],
                        ['name' => 'Pharmacy', 'icon' => 'medkit-outline'],
                        ['name' => 'Gym', 'icon' => 'barbell-outline'],
                    ],
                ],
                [
                    'name' => 'Shopping',
                    'icon' => 'bag-outline',
                    'children' => [
                        ['name' => 'Clothing', 'icon' => 'shirt-outline'],
                        ['name' => 'Electronics', 'icon' => 'phone-portrait-outline'],
                        ['name' => 'Household Items', 'icon' => 'home-outline'],
                    ],
                ],
            ],
            'income' => [
                [
                    'name' => 'Salary',
                    'icon' => 'wallet-outline',
                    'children' => [
                        ['name' => 'Base Salary', 'icon' => 'cash-outline'],
                        ['name' => 'Overtime', 'icon' => 'time-outline'],
                        ['name' => 'Allowance', 'icon' => 'card-outline'],
                    ],
                ],
                [
                    'name' => 'Freelance & Side Hustle',
                    'icon' => 'briefcase-outline',
                    'children' => [
                        ['name' => 'Design Project', 'icon' => 'color-palette-outline'],
                        ['name' => 'Development Project', 'icon' => 'code-slash-outline'],
                        ['name' => 'Consulting', 'icon' => 'people-outline'],
                    ],
                ],
                [
                    'name' => 'Investment Returns',
                    'icon' => 'trending-up-outline',
                    'children' => [
                        ['name' => 'Dividends', 'icon' => 'stats-chart-outline'],
                        ['name' => 'Savings Interest', 'icon' => 'analytics-outline'],
                        ['name' => 'Bond Interest', 'icon' => 'bar-chart-outline'],
                    ],
                ],
                [
                    'name' => 'Other Income',
                    'icon' => 'gift-outline',
                    'children' => [
                        ['name' => 'Gift Money', 'icon' => 'gift-outline'],
                        ['name' => 'Refund', 'icon' => 'refresh-outline'],
                        ['name' => 'Reimbursement', 'icon' => 'receipt-outline'],
                    ],
                ],
            ],
            'debt_loan' => [
                [
                    'name' => 'Personal Loan',
                    'icon' => 'cash-outline',
                    'children' => [
                        ['name' => 'Bank Personal Loan', 'icon' => 'business-outline'],
                        ['name' => 'App Loan', 'icon' => 'phone-portrait-outline'],
                    ],
                ],
                [
                    'name' => 'Credit Card',
                    'icon' => 'card-outline',
                    'children' => [
                        ['name' => 'Monthly Statement', 'icon' => 'calendar-outline'],
                        ['name' => 'Minimum Payment', 'icon' => 'remove-circle-outline'],
                    ],
                ],
                [
                    'name' => 'Mortgage',
                    'icon' => 'home-outline',
                    'children' => [
                        ['name' => 'Principal Payment', 'icon' => 'cash-outline'],
                        ['name' => 'Interest Payment', 'icon' => 'trending-up-outline'],
                    ],
                ],
                [
                    'name' => 'Borrowed From Friend',
                    'icon' => 'people-outline',
                    'children' => [
                        ['name' => 'Borrow Received', 'icon' => 'arrow-down-circle-outline'],
                        ['name' => 'Repayment Sent', 'icon' => 'arrow-up-circle-outline'],
                    ],
                ],
            ],
        ];
    }
}
