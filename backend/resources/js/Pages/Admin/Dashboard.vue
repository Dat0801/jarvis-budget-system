<script setup>
defineProps({
  totals: Object,
  transactions: Array,
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold">Admin Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div class="rounded border p-4">
        <div class="text-sm text-gray-500">Total Users</div>
        <div class="text-2xl font-bold">{{ totals.users }}</div>
      </div>
      <div class="rounded border p-4">
        <div class="text-sm text-gray-500">Total Income</div>
        <div class="text-2xl font-bold">{{ totals.income }}</div>
      </div>
      <div class="rounded border p-4">
        <div class="text-sm text-gray-500">Total Expenses</div>
        <div class="text-2xl font-bold">{{ totals.expenses }}</div>
      </div>
    </div>

    <div class="mt-8">
      <h2 class="text-lg font-semibold">All Transactions</h2>
      <div class="mt-2 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2">Type</th>
              <th class="py-2">Jar</th>
              <th class="py-2">Amount</th>
              <th class="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in transactions" :key="`${item.type}-${item.id}`" class="border-b">
              <td class="py-2 capitalize">{{ item.type }}</td>
              <td class="py-2">{{ item.jar_id }}</td>
              <td class="py-2">{{ item.amount }}</td>
              <td class="py-2">{{ item.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
